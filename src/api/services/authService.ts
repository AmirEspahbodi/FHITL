import { apiClient } from "../client";
import { LoginRequest, LoginResponse } from "../types";

/**
 * Service layer for Authentication API operations
 * Enhanced with comprehensive error handling and validation
 */
export const authService = {
  /**
   * Authenticate user with credentials
   *
   * @param username - User's username
   * @param password - User's password (transmitted over HTTPS only)
   * @returns Promise resolving to access token and token type
   * @throws Enhanced error with userMessage and errorType properties
   *
   * Endpoint: POST /api/v1/login/access-token
   *
   * Error Handling:
   *   - Network errors: Connection, timeout, DNS failures
   *   - HTTP errors: 401, 403, 422, 429, 500+
   *   - Validation errors: Missing/invalid response fields
   *   - Malformed responses: HTML instead of JSON, empty responses
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    // ========================================================================
    // INPUT VALIDATION
    // ========================================================================

    if (!username || !username.trim()) {
      throw new Error("Username is required");
    }

    if (!password) {
      throw new Error("Password is required");
    }

    // Sanitize username (trim whitespace)
    const sanitizedUsername = username.trim();

    // Basic length validation (prevent obviously invalid requests)
    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 50) {
      throw new Error("Invalid username format");
    }

    if (password.length < 6 || password.length > 128) {
      throw new Error("Invalid password format");
    }

    // ========================================================================
    // PREPARE REQUEST
    // ========================================================================

    const payload: LoginRequest = {
      username: sanitizedUsername,
      password,
    };

    if (import.meta.env.DEV) {
      console.log("[Auth Service] Attempting login for:", sanitizedUsername);
    }

    try {
      // ======================================================================
      // API CALL
      // ======================================================================

      const { data } = await apiClient.post<LoginResponse>(
        "/login/access-token",
        payload,
      );

      // ======================================================================
      // RESPONSE VALIDATION
      // ======================================================================

      // Check if response exists
      if (!data) {
        console.error("[Auth Service] No data in response");
        throw new Error("Invalid response from server: empty response");
      }

      // Check if response has required fields
      if (!data.access_token) {
        console.error("[Auth Service] Response missing access_token:", data);
        throw new Error(
          "Invalid response from server: missing authentication token",
        );
      }

      if (!data.token_type) {
        console.warn(
          "[Auth Service] Response missing token_type, defaulting to 'bearer'",
        );
        data.token_type = "bearer";
      }

      // Validate token format (basic structure check)
      if (!authService.validateTokenFormat(data.access_token)) {
        console.error("[Auth Service] Invalid token format received");
        throw new Error("Invalid authentication token received from server");
      }

      // ======================================================================
      // SUCCESS
      // ======================================================================

      if (import.meta.env.DEV) {
        console.log("[Auth Service] Login successful:", {
          username: sanitizedUsername,
          tokenType: data.token_type,
          tokenLength: data.access_token.length,
        });
      }

      return data;
    } catch (error: any) {
      // ======================================================================
      // ERROR HANDLING
      // ======================================================================

      // If error already has userMessage (from interceptor), just re-throw
      if (error.userMessage) {
        throw error;
      }

      // Log error for debugging (dev mode only)
      if (import.meta.env.DEV) {
        console.error("[Auth Service] Login failed:", {
          username: sanitizedUsername,
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }

      // Categorize and enhance error
      let userMessage = "Authentication failed. Please try again.";

      if (error.response) {
        // HTTP error with response
        const status = error.response.status;
        const responseData = error.response.data;

        switch (status) {
          case 401:
            userMessage = "Invalid username or password. Please try again.";
            break;

          case 403:
            userMessage =
              "Account access denied. Please contact your administrator.";
            break;

          case 422:
            // Validation error - try to extract details
            if (Array.isArray(responseData?.detail)) {
              const validationErrors = responseData.detail
                .map((err: any) => err.msg || "")
                .filter(Boolean)
                .join(", ");
              userMessage =
                validationErrors ||
                "Invalid input. Please check your credentials.";
            } else if (responseData?.detail) {
              userMessage = responseData.detail;
            } else {
              userMessage = "Invalid input. Please check your credentials.";
            }
            break;

          case 429:
            const retryAfter = error.response.headers["retry-after"];
            const waitTime = retryAfter
              ? `${retryAfter} seconds`
              : "a few minutes";
            userMessage = `Too many login attempts. Please wait ${waitTime} and try again.`;
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            userMessage = "Server error. Please try again later.";
            break;

          default:
            userMessage =
              responseData?.error?.message ||
              responseData?.detail ||
              userMessage;
        }
      } else if (error.request) {
        // Request made but no response (network error)
        if (
          error.code === "ECONNABORTED" ||
          error.message.includes("timeout")
        ) {
          userMessage = "Connection timeout. Please try again.";
        } else if (
          error.code === "ERR_NETWORK" ||
          error.code === "ERR_CONNECTION_REFUSED"
        ) {
          userMessage =
            "Unable to connect to server. Please check your internet connection.";
        } else if (error.code === "ERR_NAME_NOT_RESOLVED") {
          userMessage = "Could not reach the server. Please try again later.";
        } else {
          userMessage =
            "Network error. Please check your connection and try again.";
        }
      } else {
        // Other errors (setup, validation, etc.)
        userMessage = error.message || userMessage;
      }

      // Create enhanced error with user-friendly message
      const enhancedError = new Error(userMessage) as any;
      enhancedError.originalError = error;
      enhancedError.userMessage = userMessage;

      throw enhancedError;
    }
  },

  /**
   * Logout user (optional endpoint)
   * Currently client-side only
   */
  logout: async (): Promise<void> => {
    // Future: Call backend logout endpoint if implemented
    // await apiClient.post('/logout');

    if (import.meta.env.DEV) {
      console.log("[Auth Service] Logout requested (client-side only)");
    }
  },

  /**
   * Validate JWT token format (client-side check only)
   * Does NOT verify signature - server's responsibility
   *
   * @param token - JWT token to validate
   * @returns True if token has valid JWT structure
   */
  validateTokenFormat: (token: string): boolean => {
    if (!token || typeof token !== "string") {
      return false;
    }

    // JWT tokens have 3 parts: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be non-empty and base64url encoded
    for (const part of parts) {
      if (!part || part.length === 0) {
        return false;
      }

      // Check if part looks like base64url (alphanumeric, -, _)
      if (!/^[A-Za-z0-9_-]+$/.test(part)) {
        return false;
      }
    }

    // Try to parse payload (without verification)
    try {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64 + "===".slice((base64.length + 3) % 4);
      const decodedPayload = JSON.parse(atob(paddedBase64));

      // Check for required JWT fields
      if (!decodedPayload || typeof decodedPayload !== "object") {
        return false;
      }

      return true;
    } catch (error) {
      console.warn("[Auth Service] Could not parse token payload:", error);
      return false;
    }
  },

  /**
   * Extract token expiration time (client-side helper)
   *
   * @param token - JWT token to parse
   * @returns Expiration timestamp (seconds since epoch) or null if invalid
   *
   * Security Warning: This is client-side only for UX purposes
   * Server MUST validate token on each request
   */
  getTokenExpiration: (token: string): number | null => {
    if (!authService.validateTokenFormat(token)) {
      return null;
    }

    try {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64 + "===".slice((base64.length + 3) % 4);
      const decodedPayload = JSON.parse(atob(paddedBase64));

      return decodedPayload.exp || null;
    } catch (error) {
      console.error("[Auth Service] Failed to parse token expiration:", error);
      return null;
    }
  },

  /**
   * Check if token is expired (client-side check)
   *
   * @param token - JWT token to check
   * @returns True if token is expired or invalid
   */
  isTokenExpired: (token: string): boolean => {
    const exp = authService.getTokenExpiration(token);
    if (!exp) {
      return true; // Treat invalid tokens as expired
    }

    // Get current time in seconds, add 30s buffer for clock skew
    const now = Math.floor(Date.now() / 1000) + 30;
    return now >= exp;
  },
};
