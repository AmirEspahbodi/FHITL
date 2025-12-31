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
// Request Interceptor
// ============================================================================

/**
 * Intercepts outgoing requests to add authentication headers and logging
 * Future: Add JWT token injection here when auth is implemented
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
      );
    }

    // TODO: Add authentication token when implemented
    // const token = localStorage.getItem('auth_token');
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error: AxiosError) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// ============================================================================
// Response Interceptor
// ============================================================================

/**
 * Intercepts API responses for global error handling and logging
 * Normalizes error messages for consistent UI feedback
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

      // Log specific error types
      if (status === 401) {
        console.error("[API Auth Error] Unauthorized access");
        // TODO: Redirect to login page when auth is implemented
      } else if (status === 403) {
        console.error("[API Permission Error] Forbidden resource");
      } else if (status === 404) {
        console.error("[API Not Found]", error.config?.url);
      } else if (status >= 500) {
        console.error("[API Server Error]", errorMessage);
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
