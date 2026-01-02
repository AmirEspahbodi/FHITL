import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface User {
  username: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  persistSession: boolean;
}

interface AuthContextValue extends AuthState {
  login: (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => void;
  setPersistSession: (persist: boolean) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

// ============================================================================
// Constants
// ============================================================================

const TOKEN_STORAGE_KEY = "cogniloop_auth_token";
const USER_STORAGE_KEY = "cogniloop_auth_user";
const PERSIST_STORAGE_KEY = "cogniloop_persist_session";

// ============================================================================
// Storage Helper Functions
// ============================================================================

/**
 * Safely check if sessionStorage is available
 * Returns false in private browsing mode or when disabled
 */
const isStorageAvailable = (): boolean => {
  try {
    const testKey = "__storage_test__";
    sessionStorage.setItem(testKey, "test");
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn("[Auth] sessionStorage is not available:", error);
    return false;
  }
};

/**
 * Safely get item from sessionStorage
 * Returns null if storage unavailable or item doesn't exist
 */
const safeGetItem = (key: string): string | null => {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error(`[Auth] Failed to get item '${key}' from storage:`, error);
    return null;
  }
};

/**
 * Safely set item in sessionStorage
 * Returns true on success, false on failure
 */
const safeSetItem = (key: string, value: string): boolean => {
  if (!isStorageAvailable()) {
    if (import.meta.env.DEV) {
      console.warn(`[Auth] Cannot set '${key}': Storage unavailable`);
    }
    return false;
  }

  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error("[Auth] Storage quota exceeded:", error);
    } else {
      console.error(`[Auth] Failed to set item '${key}':`, error);
    }
    return false;
  }
};

/**
 * Safely remove item from sessionStorage
 */
const safeRemoveItem = (key: string): void => {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error(`[Auth] Failed to remove item '${key}':`, error);
  }
};

/**
 * Validate JWT token format (basic structure check)
 * Does NOT verify signature - server's responsibility
 */
const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    return false;
  }

  // JWT tokens have 3 parts: header.payload.signature
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be non-empty
  return parts.every((part) => part.length > 0);
};

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true,
    user: null,
    persistSession: false,
  });

  // --------------------------------------------------------------------------
  // Storage Management
  // --------------------------------------------------------------------------

  /**
   * Store token with error handling
   * Returns true if successful, false if storage failed
   */
  const storeToken = useCallback((token: string, persist: boolean): boolean => {
    if (!persist) {
      return true; // Memory-only storage, always succeeds
    }

    const success = safeSetItem(TOKEN_STORAGE_KEY, token);

    if (!success && import.meta.env.DEV) {
      console.warn(
        "[Auth] Could not persist token. Session will be memory-only.",
      );
    }

    return success;
  }, []);

  /**
   * Retrieve token from storage
   */
  const retrieveToken = useCallback((): string | null => {
    const persistPreference = safeGetItem(PERSIST_STORAGE_KEY);
    if (persistPreference === "true") {
      return safeGetItem(TOKEN_STORAGE_KEY);
    }
    return null;
  }, []);

  /**
   * Clear all stored authentication data
   * Handles errors gracefully
   */
  const clearStoredAuth = useCallback(() => {
    try {
      safeRemoveItem(TOKEN_STORAGE_KEY);
      safeRemoveItem(USER_STORAGE_KEY);
      safeRemoveItem(PERSIST_STORAGE_KEY);

      if (import.meta.env.DEV) {
        console.log("[Auth] Cleared all stored authentication data");
      }
    } catch (error) {
      console.error("[Auth] Error during storage cleanup:", error);
      // Continue anyway - don't let cleanup errors block logout
    }
  }, []);

  // --------------------------------------------------------------------------
  // Authentication Operations
  // --------------------------------------------------------------------------

  /**
   * Authenticate user with credentials
   * Comprehensive error handling for all scenarios
   */
  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      // Set loading state
      // setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Import authService dynamically
        const { authService } = await import("../api/services/authService");

        // Call login API
        const response = await authService.login(username, password);

        // ====================================================================
        // VALIDATE RESPONSE
        // ====================================================================

        if (!response) {
          throw new Error("No response received from server");
        }

        const { access_token } = response;

        if (!access_token) {
          console.error(
            "[Auth] Login response missing access_token:",
            response,
          );
          throw new Error(
            "Invalid response from server: missing authentication token",
          );
        }

        // Validate token format
        if (!isValidTokenFormat(access_token)) {
          console.error("[Auth] Received invalid token format");
          throw new Error(
            "Invalid authentication token received. Please try again.",
          );
        }

        // ====================================================================
        // STORE CREDENTIALS
        // ====================================================================

        let storageSuccess = true;

        // Attempt to persist token if requested
        if (rememberMe) {
          storageSuccess = storeToken(access_token, true);

          // Also persist username and preference
          const userStored = safeSetItem(USER_STORAGE_KEY, username);
          const prefStored = safeSetItem(PERSIST_STORAGE_KEY, "true");

          if (!userStored || !prefStored) {
            storageSuccess = false;
          }
        }

        // ====================================================================
        // UPDATE AUTH STATE
        // ====================================================================

        setAuthState({
          token: access_token,
          isAuthenticated: true,
          isLoading: false,
          user: { username },
          persistSession: rememberMe && storageSuccess,
        });

        // Notify user if storage failed but login succeeded
        if (rememberMe && !storageSuccess) {
          // Note: This notification should be shown in the UI
          // The component calling login should handle this
          console.warn(
            "[Auth] Login successful but session persistence failed. " +
              "You will need to log in again when you close this tab.",
          );
        }

        if (import.meta.env.DEV) {
          console.log("[Auth] Login successful:", {
            username,
            tokenReceived: true,
            sessionPersisted: rememberMe && storageSuccess,
          });
        }
      } catch (error: any) {
        // ====================================================================
        // ERROR HANDLING
        // ====================================================================

        console.error("[Auth] Login failed:", error);

        // Clear any partial state
        clearStoredAuth();

        setAuthState({
          token: null,
          isAuthenticated: false,
          isLoading: false,
          user: null,
          persistSession: false,
        });

        // Determine user-friendly error message
        let errorMessage = "Authentication failed. Please try again.";

        if (error.userMessage) {
          // Use enhanced error message from API client
          errorMessage = error.userMessage;
        } // ✅ AFTER (Smart Fallback with Edge Cases)
        // Determine user-friendly error message

        // Priority 1: Use enhanced userMessage if available and non-empty
        if (
          error.userMessage &&
          typeof error.userMessage === "string" &&
          error.userMessage.trim()
        ) {
          errorMessage = error.userMessage;
        }
        // Priority 2: Check response status directly (fallback)
        else if (error.response?.status) {
          const status = error.response.status;
          const detail = error.response.data?.detail;

          switch (status) {
            case 400:
              errorMessage =
                detail || "Invalid request. Please check your input.";
              break;
            case 401:
              errorMessage = "Invalid username or password. Please try again.";
              break;
            case 403:
              errorMessage =
                "Account access denied. Please contact your administrator.";
              break;
            case 429:
              // Extract retry-after if available
              const retryAfter = error.response.headers?.["retry-after"];
              const waitTime = retryAfter
                ? `${retryAfter} seconds`
                : "a few moments";
              errorMessage =
                detail ||
                `Too many login attempts. Please wait ${waitTime} and try again.`;
              break;
            case 422:
              errorMessage =
                detail || "Invalid input. Please check your credentials.";
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorMessage = "Server error. Please try again later.";
              break;
            default:
              errorMessage =
                detail ||
                `Request failed with status ${status}. Please try again.`;
          }
        }
        // Priority 3: Check for network/timeout errors
        else if (error.request) {
          if (
            error.code === "ECONNABORTED" ||
            error.message?.includes("timeout")
          ) {
            errorMessage = "Connection timeout. Please try again.";
          } else if (
            error.code === "ERR_NETWORK" ||
            error.code === "ERR_CONNECTION_REFUSED"
          ) {
            errorMessage =
              "Unable to connect to server. Please check your internet connection.";
          } else {
            errorMessage =
              "Network error. Please check your connection and try again.";
          }
        }
        // Priority 4: Use error.message as last resort
        else if (error.message && typeof error.message === "string") {
          errorMessage = error.message;
        }

        if (import.meta.env.DEV) {
          console.log("[Auth Context] Login error handled:", {
            finalMessage: errorMessage,
            hadUserMessage: !!error.userMessage,
            status: error.response?.status,
            errorType: error.errorType,
          });
        } else if (error.request) {
          // Request made but no response (network error)
          errorMessage =
            "Unable to connect to server. Please check your internet connection.";
        } else if (error.message) {
          // Other errors (validation, setup, etc.)
          if (error.message.includes("timeout")) {
            errorMessage = "Connection timeout. Please try again.";
          } else if (error.message.includes("Network Error")) {
            errorMessage = "Network error. Please check your connection.";
          } else if (
            error.message.includes("Invalid response") ||
            error.message.includes("missing")
          ) {
            errorMessage = error.message; // Use our custom validation messages
          }
        }

        // Re-throw with sanitized message
        throw new Error(errorMessage);
      }
    },
    [storeToken, clearStoredAuth],
  );

  /**
   * Logout user and clear all authentication state
   */
  const logout = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log("[Auth] Logging out user");
    }

    // Clear stored tokens and data
    clearStoredAuth();

    // Reset auth state
    setAuthState({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      persistSession: false,
    });
  }, [clearStoredAuth]);

  /**
   * Update session persistence preference
   */
  const setPersistSession = useCallback(
    (persist: boolean) => {
      setAuthState((prev) => ({ ...prev, persistSession: persist }));

      try {
        if (persist) {
          safeSetItem(PERSIST_STORAGE_KEY, "true");
          if (authState.token) {
            safeSetItem(TOKEN_STORAGE_KEY, authState.token);
          }
          if (authState.user) {
            safeSetItem(USER_STORAGE_KEY, authState.user.username);
          }
        } else {
          safeRemoveItem(PERSIST_STORAGE_KEY);
          safeRemoveItem(TOKEN_STORAGE_KEY);
          safeRemoveItem(USER_STORAGE_KEY);
        }
      } catch (error) {
        console.error("[Auth] Failed to update persistence preference:", error);
      }
    },
    [authState.token, authState.user],
  );

  // --------------------------------------------------------------------------
  // Session Restoration
  // --------------------------------------------------------------------------

  useEffect(() => {
    const restoreSession = async () => {
      if (import.meta.env.DEV) {
        console.log("[Auth] Attempting to restore session...");
      }

      try {
        // Check if storage is available
        if (!isStorageAvailable()) {
          console.warn("[Auth] Storage unavailable, cannot restore session");
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Check for existing token
        const token = retrieveToken();
        const username = safeGetItem(USER_STORAGE_KEY);

        if (!token || !username) {
          if (import.meta.env.DEV) {
            console.log("[Auth] No stored session found");
          }
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Validate token format
        if (!isValidTokenFormat(token)) {
          console.warn("[Auth] Stored token has invalid format, clearing");
          clearStoredAuth();
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Check if token appears to be expired (client-side check)
        try {
          const payload = token.split(".")[1];
          const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
          const paddedBase64 = base64 + "===".slice((base64.length + 3) % 4);
          const decodedPayload = JSON.parse(atob(paddedBase64));

          if (decodedPayload.exp) {
            const now = Math.floor(Date.now() / 1000);
            if (now >= decodedPayload.exp) {
              console.warn("[Auth] Stored token is expired, clearing");
              clearStoredAuth();
              setAuthState((prev) => ({ ...prev, isLoading: false }));
              return;
            }
          }
        } catch (error) {
          console.warn("[Auth] Could not parse token expiration:", error);
          // Continue anyway - server will validate
        }

        // Token looks valid, restore session
        setAuthState({
          token,
          isAuthenticated: true,
          isLoading: false,
          user: { username },
          persistSession: true,
        });

        if (import.meta.env.DEV) {
          console.log("[Auth] Session restored successfully for:", username);
        }
      } catch (error) {
        console.error("[Auth] Failed to restore session:", error);
        clearStoredAuth();
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    restoreSession();
  }, [retrieveToken, clearStoredAuth]);

  // --------------------------------------------------------------------------
  // Context Value
  // --------------------------------------------------------------------------

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    logout,
    setPersistSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
