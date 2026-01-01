import { apiClient } from "../client";
import { LoginRequest, LoginResponse } from "../types";

/**
 * Service layer for Authentication API operations
 * Handles all auth-related API calls with proper typing and error handling
 */
export const authService = {
  /**
   * Authenticate user with credentials
   *
   * @param username - User's username
   * @param password - User's password (transmitted over HTTPS only)
   * @returns Promise resolving to access token and token type
   * @throws AxiosError with 401 for invalid credentials
   * @throws AxiosError with 422 for validation errors
   *
   * Endpoint: POST /api/v1/login/access-token
   * Content-Type: application/json
   *
   * Security Notes:
   *   - Password sent via POST body (not URL params)
   *   - Always use HTTPS in production
   *   - Token returned in response body (not cookies)
   *   - Client responsible for secure token storage
   *
   * Success Response (200):
   * ```json
   * {
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "token_type": "bearer"
   * }
   * ```
   *
   * Error Response (401):
   * ```json
   * {
   *   "detail": "Incorrect username or password"
   * }
   * ```
   *
   * Error Response (422):
   * ```json
   * {
   *   "detail": [
   *     {
   *       "loc": ["body", "username"],
   *       "msg": "field required",
   *       "type": "value_error.missing"
   *     }
   *   ]
   * }
   * ```
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const payload: LoginRequest = {
      username,
      password,
    };

    const { data } = await apiClient.post<LoginResponse>(
      "/login/access-token",
      payload,
    );

    // Validate response structure
    if (!data.access_token || !data.token_type) {
      throw new Error("Invalid response from authentication server");
    }

    // Log successful authentication (username only, never log token or password)
    if (import.meta.env.DEV) {
      console.log("[Auth Service] Login successful for user:", username);
    }

    return data;
  },

  /**
   * Logout user (optional endpoint)
   *
   * This is a placeholder for future logout endpoint implementation.
   * Currently, logout is handled client-side by clearing tokens.
   *
   * Backend Implementation Notes:
   *   - If backend implements token blacklisting, add:
   *     POST /api/v1/logout
   *     Authorization: Bearer {token}
   *   - Token should be invalidated server-side
   *   - Client will clear token regardless of response
   *
   * @returns Promise resolving when logout completes
   */
  logout: async (): Promise<void> => {
    // Future: Call backend logout endpoint
    // await apiClient.post('/logout');

    // For now, logout is client-side only
    if (import.meta.env.DEV) {
      console.log("[Auth Service] Logout requested (client-side only)");
    }
  },

  /**
   * Validate token format (client-side check only)
   *
   * Performs basic JWT structure validation.
   * Does NOT verify signature or expiration (server's responsibility).
   *
   * @param token - JWT token to validate
   * @returns True if token has valid JWT structure
   *
   * Valid JWT Structure:
   *   - Three parts separated by dots
   *   - Format: header.payload.signature
   *   - Each part is base64url encoded
   *
   * Note: This is NOT a security check, only a sanity check.
   * Server MUST validate token signature and expiration.
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

    // Basic check: each part should be non-empty
    return parts.every((part) => part.length > 0);
  },

  /**
   * Extract token expiration time (client-side helper)
   *
   * Extracts exp claim from JWT payload for client-side expiration handling.
   * Does NOT validate signature - purely informational.
   *
   * @param token - JWT token to parse
   * @returns Expiration timestamp (seconds since epoch) or null if invalid
   *
   * Security Warning:
   *   - This reads the payload without signature verification
   *   - NEVER trust this for access control decisions
   *   - Server MUST validate token on each request
   *   - Used only for UX (e.g., auto-logout before expiration)
   */
  getTokenExpiration: (token: string): number | null => {
    try {
      if (!authService.validateTokenFormat(token)) {
        return null;
      }

      // JWT payload is the middle part
      const payload = token.split(".")[1];

      // Decode base64url (replace - with +, _ with /, add padding)
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64 + "===".slice((base64.length + 3) % 4);

      // Decode and parse JSON
      const decodedPayload = JSON.parse(atob(paddedBase64));

      // Return exp claim (seconds since epoch)
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
   *
   * Note: Adds 30-second buffer to account for clock skew
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

/**
 * ============================================================================
 * SECURITY IMPLEMENTATION NOTES
 * ============================================================================
 *
 * PASSWORD HANDLING:
 * ------------------
 * - Passwords sent via POST body over HTTPS
 * - Never logged or stored client-side
 * - Never sent in URL parameters
 * - Backend should hash with bcrypt/argon2
 *
 * TOKEN HANDLING:
 * ---------------
 * - Token received in response body
 * - Client stores in memory or sessionStorage (user choice)
 * - Never stored in localStorage (XSS risk)
 * - Never sent in URL parameters
 * - Sent via Authorization header: "Bearer {token}"
 *
 * ERROR HANDLING:
 * ---------------
 * - 401: Invalid credentials (generic message to prevent user enumeration)
 * - 422: Validation error (missing fields)
 * - 500: Server error (generic message)
 * - Network errors: User-friendly message
 *
 * LOGGING:
 * --------
 * - Never log passwords (input or transmitted)
 * - Never log tokens (except "token exists: true/false" in dev mode)
 * - Only log username on successful auth (dev mode only)
 * - Detailed errors in console (dev mode only)
 *
 * RATE LIMITING:
 * --------------
 * - Backend should implement rate limiting (e.g., 5 attempts per 15 minutes)
 * - Frontend should display rate limit feedback if backend provides it
 * - No client-side enforcement (can be bypassed)
 *
 * CSRF PROTECTION:
 * ----------------
 * - Not required for Bearer token auth (no cookies)
 * - If switching to cookie-based auth, implement CSRF tokens
 *
 * FUTURE ENHANCEMENTS:
 * --------------------
 * - Token refresh mechanism (if backend supports)
 * - Biometric authentication (WebAuthn)
 * - Multi-factor authentication (TOTP/SMS)
 * - Social login (OAuth2)
 * - Password reset flow
 *
 * ============================================================================
 */
