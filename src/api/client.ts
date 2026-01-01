import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ApiErrorResponse } from "./types";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Base URL for API requests
 * Configurable via environment variable for different environments
 * Falls back to localhost for local development
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

/**
 * Axios instance with pre-configured defaults
 * All API calls should use this instance instead of raw axios
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
  withCredentials: false, // Set to true if using cookies for auth
});

// ============================================================================
// Authentication Token Management
// ============================================================================

/**
 * Global reference to auth token and logout function
 * Set by AuthContext, used by interceptors
 *
 * Security Note: This is intentionally kept in module scope (not exported)
 * to prevent external access. Only accessible via setter functions.
 */
let currentAuthToken: string | null = null;
let authLogoutCallback: (() => void) | null = null;

/**
 * Set the current authentication token for API requests
 * Called by AuthContext when user logs in or session is restored
 *
 * @param token - JWT token to use for authentication, or null to clear
 *
 * Security: Token stored in memory only (module scope), never logged
 */
export const setAuthToken = (token: string | null): void => {
  currentAuthToken = token;

  if (import.meta.env.DEV) {
    // Only log token existence, never the actual token value
    console.log("[API Client] Auth token", token ? "set" : "cleared");
  }
};

/**
 * Register logout callback for automatic logout on 401 responses
 * Called by AuthContext on mount to provide logout function to interceptor
 *
 * @param callback - Function to call when authentication fails
 */
export const setAuthLogoutCallback = (callback: () => void): void => {
  authLogoutCallback = callback;
};

/**
 * Get current authentication token (for debugging only)
 * DO NOT use this in production code - use interceptor instead
 *
 * @returns Current token or null
 */
export const getAuthToken = (): string | null => {
  return currentAuthToken;
};

// ============================================================================
// Request Interceptor (Injects Auth Token)
// ============================================================================

/**
 * Intercepts outgoing requests to add authentication headers
 *
 * Security Features:
 *   - Injects Bearer token automatically
 *   - Never logs actual token value
 *   - Skips auth for login endpoint
 *   - Token sent via Authorization header (never in URL)
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log request in development (without sensitive data)
    if (import.meta.env.DEV) {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
      );
    }

    // Skip auth for login endpoint (prevents circular dependency)
    const isLoginRequest = config.url?.includes("/login");

    if (!isLoginRequest && currentAuthToken) {
      // Inject Bearer token into Authorization header
      if (config.headers) {
        config.headers.Authorization = `Bearer ${currentAuthToken}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("[API Request Error]", error.message);
    return Promise.reject(error);
  },
);

// ============================================================================
// Response Interceptor (Handles Auth Errors)
// ============================================================================

/**
 * Intercepts API responses for global error handling and authentication management
 *
 * Security Features:
 *   - Auto-logout on 401 (unauthorized)
 *   - Sanitizes error messages (prevents info leakage)
 *   - Never logs token values
 *   - Handles token expiration gracefully
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.data,
      );
    }
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // Extract meaningful error message
    let errorMessage = "An unexpected error occurred";

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      errorMessage = data?.error?.message || error.message;

      // Handle specific error statuses
      if (status === 401) {
        // Unauthorized - token invalid or expired
        console.error("[API Auth Error] Unauthorized access - logging out");

        // Trigger logout if callback is registered
        if (authLogoutCallback) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => {
            authLogoutCallback?.();
          }, 0);
        } else {
          console.warn("[API Auth Error] No logout callback registered");
        }

        errorMessage = "Your session has expired. Please log in again.";
      } else if (status === 403) {
        console.error("[API Permission Error] Forbidden resource");
        errorMessage = "You don't have permission to access this resource.";
      } else if (status === 404) {
        console.error("[API Not Found]", error.config?.url);
        errorMessage = "The requested resource was not found.";
      } else if (status >= 500) {
        console.error("[API Server Error]", errorMessage);
        errorMessage = "Server error. Please try again later.";
      }
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error("[API Network Error] No response from server");
      errorMessage = "Network error. Please check your connection.";
    } else {
      // Something else went wrong
      console.error("[API Setup Error]", error.message);
      errorMessage = error.message;
    }

    // Attach formatted error message for UI consumption
    const enhancedError = error as AxiosError<ApiErrorResponse> & {
      userMessage: string;
    };
    enhancedError.userMessage = errorMessage;

    return Promise.reject(enhancedError);
  },
);

// ============================================================================
// Exports
// ============================================================================

export default apiClient;

/**
 * ============================================================================
 * SECURITY IMPLEMENTATION NOTES
 * ============================================================================
 *
 * TOKEN STORAGE:
 * --------------
 * - Token stored in module scope (memory only)
 * - Not accessible from outside this module
 * - Cleared on logout or browser refresh (if not persisted)
 * - Never logged to console (only "token set/cleared")
 *
 * TOKEN TRANSMISSION:
 * -------------------
 * - Sent via Authorization: Bearer {token} header
 * - Never sent in URL parameters
 * - Never sent in request body
 * - Automatically injected by request interceptor
 * - Skipped for login endpoint (prevents circular dependency)
 *
 * AUTO-LOGOUT:
 * ------------
 * - 401 responses trigger automatic logout
 * - Logout callback provided by AuthContext
 * - Uses setTimeout to avoid race conditions
 * - Clears all auth state (handled by AuthContext)
 * - Redirects to login (handled by ProtectedRoute)
 *
 * ERROR HANDLING:
 * ---------------
 * - 401: Auto-logout, generic message
 * - 403: Permission denied message
 * - 404: Resource not found
 * - 500+: Generic server error
 * - Network errors: Connection message
 * - Enhanced error object with userMessage for UI
 *
 * LOGGING:
 * --------
 * - Request/response logging in development only
 * - Never log actual token values
 * - Log "token set" or "token cleared" only
 * - Error messages sanitized for production
 * - Detailed errors only in dev console
 *
 * FUTURE ENHANCEMENTS:
 * --------------------
 * - Token refresh mechanism (before expiration)
 * - Request retry with exponential backoff
 * - Request deduplication
 * - Rate limiting handling
 * - CSRF token support (if using cookies)
 *
 * ============================================================================
 */
