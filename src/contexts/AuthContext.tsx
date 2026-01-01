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

/**
 * User information stored in auth state
 * Minimal data to reduce attack surface
 */
interface User {
  username: string;
}

/**
 * Authentication state structure
 */
interface AuthState {
  /** JWT token stored in memory (primary) or sessionStorage (fallback) */
  token: string | null;
  /** Current authentication status */
  isAuthenticated: boolean;
  /** Loading state during auth operations */
  isLoading: boolean;
  /** Authenticated user information */
  user: User | null;
  /** Whether to persist auth state across tab refresh */
  persistSession: boolean;
}

/**
 * Authentication context value interface
 */
interface AuthContextValue extends AuthState {
  /** Authenticate user with credentials */
  login: (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  /** Clear authentication state and token */
  logout: () => void;
  /** Update session persistence preference */
  setPersistSession: (persist: boolean) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

/**
 * React Context for authentication state and operations
 * Provides centralized auth management across the application
 */
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

// ============================================================================
// Constants
// ============================================================================

/** SessionStorage key for token persistence (when user opts in) */
const TOKEN_STORAGE_KEY = "cogniloop_auth_token";

/** SessionStorage key for username persistence */
const USER_STORAGE_KEY = "cogniloop_auth_user";

/** SessionStorage key for persistence preference */
const PERSIST_STORAGE_KEY = "cogniloop_persist_session";

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 *
 * Security Features:
 *   - Token stored in React state (memory) by default
 *   - Optional sessionStorage persistence (user opt-in)
 *   - Automatic token validation on mount
 *   - Secure token cleanup on logout
 *   - No localStorage usage (XSS protection)
 *
 * Token Storage Strategy:
 *   1. Memory-only (default): Lost on refresh, maximum security
 *   2. sessionStorage (opt-in): Persists per tab, cleared on tab close
 *   3. localStorage: NEVER USED (security risk)
 *
 * @param props.children - Child components to wrap with auth context
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start as loading to check for existing session
    user: null,
    persistSession: false,
  });

  // --------------------------------------------------------------------------
  // Token Management
  // --------------------------------------------------------------------------

  /**
   * Securely store token based on persistence preference
   * @param token - JWT token to store
   * @param persist - Whether to persist to sessionStorage
   */
  const storeToken = useCallback((token: string, persist: boolean) => {
    if (persist) {
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      } catch (error) {
        console.error(
          "[Auth] Failed to persist token to sessionStorage:",
          error,
        );
        // Continue with memory-only storage
      }
    }
  }, []);

  /**
   * Retrieve token from storage based on persistence preference
   * @returns Token string or null if not found
   */
  const retrieveToken = useCallback((): string | null => {
    try {
      const persistPreference = sessionStorage.getItem(PERSIST_STORAGE_KEY);
      if (persistPreference === "true") {
        return sessionStorage.getItem(TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      console.error(
        "[Auth] Failed to retrieve token from sessionStorage:",
        error,
      );
    }
    return null;
  }, []);

  /**
   * Clear all stored authentication data
   * CRITICAL: Must clear all traces of auth state on logout
   */
  const clearStoredAuth = useCallback(() => {
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(PERSIST_STORAGE_KEY);
    } catch (error) {
      console.error("[Auth] Failed to clear sessionStorage:", error);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Authentication Operations
  // --------------------------------------------------------------------------

  /**
   * Authenticate user with credentials
   *
   * @param username - User's username
   * @param password - User's password
   * @param rememberMe - Whether to persist session across tab refresh
   * @throws Error with user-friendly message on authentication failure
   */
  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Import authService dynamically to avoid circular dependencies
        const { authService } = await import("../api/services/authService");

        // Call login API
        const response = await authService.login(username, password);

        // Extract token from response
        const { access_token } = response;

        // Validate token exists
        if (!access_token) {
          throw new Error("Invalid response from server: missing access token");
        }

        // Store token and user info
        storeToken(access_token, rememberMe);

        if (rememberMe) {
          try {
            sessionStorage.setItem(USER_STORAGE_KEY, username);
            sessionStorage.setItem(PERSIST_STORAGE_KEY, "true");
          } catch (error) {
            console.error("[Auth] Failed to persist user info:", error);
          }
        }

        // Update auth state
        setAuthState({
          token: access_token,
          isAuthenticated: true,
          isLoading: false,
          user: { username },
          persistSession: rememberMe,
        });
      } catch (error: any) {
        // Clear any partial state
        clearStoredAuth();

        setAuthState({
          token: null,
          isAuthenticated: false,
          isLoading: false,
          user: null,
          persistSession: false,
        });

        // Re-throw with sanitized error message (prevent user enumeration)
        const errorMessage =
          error.response?.status === 401
            ? "Invalid credentials. Please try again."
            : "Authentication failed. Please try again later.";

        throw new Error(errorMessage);
      }
    },
    [storeToken, clearStoredAuth],
  );

  /**
   * Logout user and clear all authentication state
   * SECURITY CRITICAL: Must clear all traces of authentication
   */
  const logout = useCallback(() => {
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

    // Optional: Call logout endpoint if backend requires it
    // This should be a fire-and-forget call (don't wait for response)
    // authService.logout().catch(() => {});
  }, [clearStoredAuth]);

  /**
   * Update session persistence preference
   * @param persist - New persistence preference
   */
  const setPersistSession = useCallback(
    (persist: boolean) => {
      setAuthState((prev) => ({ ...prev, persistSession: persist }));

      try {
        if (persist) {
          sessionStorage.setItem(PERSIST_STORAGE_KEY, "true");
          if (authState.token) {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, authState.token);
          }
          if (authState.user) {
            sessionStorage.setItem(USER_STORAGE_KEY, authState.user.username);
          }
        } else {
          sessionStorage.removeItem(PERSIST_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(USER_STORAGE_KEY);
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

  /**
   * Attempt to restore authentication session on mount
   * Only succeeds if user previously opted into session persistence
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check for existing token
        const token = retrieveToken();
        const username = sessionStorage.getItem(USER_STORAGE_KEY);

        if (token && username) {
          // Validate token is well-formed (basic check)
          if (token.split(".").length === 3) {
            setAuthState({
              token,
              isAuthenticated: true,
              isLoading: false,
              user: { username },
              persistSession: true,
            });
            return;
          }
        }
      } catch (error) {
        console.error("[Auth] Failed to restore session:", error);
      }

      // No valid session found
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    };

    restoreSession();
  }, [retrieveToken]);

  // --------------------------------------------------------------------------
  // Context Value
  // --------------------------------------------------------------------------

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    logout,
    setPersistSession,
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

/**
 * ============================================================================
 * SECURITY NOTES
 * ============================================================================
 *
 * TOKEN STORAGE:
 * - Primary: React state (memory) - most secure, lost on refresh
 * - Fallback: sessionStorage (user opt-in) - cleared on tab close
 * - NEVER: localStorage - vulnerable to XSS, persistent across sessions
 *
 * XSS PROTECTION:
 * - No eval() or Function() calls
 * - No innerHTML usage
 * - React's built-in JSX escaping
 * - Token never exposed in URLs
 *
 * ERROR HANDLING:
 * - Generic error messages to users (no user enumeration)
 * - Detailed errors only in console (development)
 * - Always clear partial state on errors
 *
 * TOKEN VALIDATION:
 * - Basic JWT structure check on restore
 * - Server validates token on each request
 * - Auto-logout on 401 responses (handled in api/client.ts)
 *
 * ============================================================================
 */
