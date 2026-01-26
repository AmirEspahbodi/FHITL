import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
// [FIX] Import the setter and callback registration from the client
import { setAuthToken, setAuthLogoutCallback } from "../api/client";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface User {
  username: string;
  user_type: "superuser" | "normal";
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
const USER_TYPE_STORAGE_KEY = "cogniloop_auth_type";
const PERSIST_STORAGE_KEY = "cogniloop_persist_session";

// ============================================================================
// Storage Helper Functions
// ============================================================================

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
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error("[Auth] Storage quota exceeded:", error);
    } else {
      console.error(`[Auth] Failed to set item '${key}':`, error);
    }
    return false;
  }
};

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

const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    return false;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }
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

  const storeToken = useCallback((token: string, persist: boolean): boolean => {
    if (!persist) {
      return true;
    }
    const success = safeSetItem(TOKEN_STORAGE_KEY, token);
    if (!success && import.meta.env.DEV) {
      console.warn(
        "[Auth] Could not persist token. Session will be memory-only.",
      );
    }
    return success;
  }, []);

  const retrieveToken = useCallback((): string | null => {
    const persistPreference = safeGetItem(PERSIST_STORAGE_KEY);
    if (persistPreference === "true") {
      return safeGetItem(TOKEN_STORAGE_KEY);
    }
    return null;
  }, []);

  const clearStoredAuth = useCallback(() => {
    try {
      safeRemoveItem(TOKEN_STORAGE_KEY);
      safeRemoveItem(USER_STORAGE_KEY);
      safeRemoveItem(USER_TYPE_STORAGE_KEY);
      safeRemoveItem(PERSIST_STORAGE_KEY);
      if (import.meta.env.DEV) {
        console.log("[Auth] Cleared all stored authentication data");
      }
    } catch (error) {
      console.error("[Auth] Error during storage cleanup:", error);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Authentication Operations
  // --------------------------------------------------------------------------

  const logout = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log("[Auth] Logging out user");
    }

    // [FIX] Ensure API client clears the token
    setAuthToken(null);

    clearStoredAuth();

    setAuthState({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      user: null,
      persistSession: false,
    });
  }, [clearStoredAuth]);

  // [FIX] Register the logout callback with the API client interceptor
  // This ensures 401 errors from the API trigger a full app logout
  useEffect(() => {
    setAuthLogoutCallback(logout);
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      try {
        const { authService } = await import("../api/services/authService");
        const response = await authService.login(username, password);

        if (!response) {
          throw new Error("No response received from server");
        }

        const { access_token, user_type } = response;

        if (!access_token) {
          throw new Error(
            "Invalid response from server: missing authentication token",
          );
        }

        if (!isValidTokenFormat(access_token)) {
          throw new Error(
            "Invalid authentication token received. Please try again.",
          );
        }

        let storageSuccess = true;

        if (rememberMe) {
          storageSuccess = storeToken(access_token, true);
          const userStored = safeSetItem(USER_STORAGE_KEY, username);
          const typeStored = safeSetItem(USER_TYPE_STORAGE_KEY, user_type);
          const prefStored = safeSetItem(PERSIST_STORAGE_KEY, "true");

          if (!userStored || !typeStored || !prefStored) {
            storageSuccess = false;
          }
        }

        // [FIX] Set the token in the API client immediately
        setAuthToken(access_token);

        setAuthState({
          token: access_token,
          isAuthenticated: true,
          isLoading: false,
          user: { username, user_type },
          persistSession: rememberMe && storageSuccess,
        });

        if (rememberMe && !storageSuccess) {
          console.warn(
            "[Auth] Login successful but session persistence failed.",
          );
        }
      } catch (error: any) {
        console.error("[Auth] Login failed:", error);

        // Ensure clean state on failure
        setAuthToken(null);
        clearStoredAuth();

        setAuthState({
          token: null,
          isAuthenticated: false,
          isLoading: false,
          user: null,
          persistSession: false,
        });

        // Error message handling (retained from original)
        let errorMessage = "Authentication failed. Please try again.";
        if (error.userMessage) {
            errorMessage = error.userMessage;
        } else if (error.message) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
      }
    },
    [storeToken, clearStoredAuth],
  );

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
            safeSetItem(USER_TYPE_STORAGE_KEY, authState.user.user_type);
          }
        } else {
          safeRemoveItem(PERSIST_STORAGE_KEY);
          safeRemoveItem(TOKEN_STORAGE_KEY);
          safeRemoveItem(USER_STORAGE_KEY);
          safeRemoveItem(USER_TYPE_STORAGE_KEY);
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
      try {
        if (!isStorageAvailable()) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const token = retrieveToken();
        const username = safeGetItem(USER_STORAGE_KEY);
        const storedUserType = safeGetItem(USER_TYPE_STORAGE_KEY);

        if (!token || !username) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const user_type: "superuser" | "normal" =
          storedUserType === "superuser" ? "superuser" : "normal";

        if (!isValidTokenFormat(token)) {
          clearStoredAuth();
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Check expiration (client-side)
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
          // Continue if parsing fails
        }

        // [FIX] Vital: Update the API client with the restored token
        setAuthToken(token);

        setAuthState({
          token,
          isAuthenticated: true,
          isLoading: false,
          user: { username, user_type },
          persistSession: true,
        });
      } catch (error) {
        console.error("[Auth] Failed to restore session:", error);
        clearStoredAuth();
        setAuthToken(null);
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
