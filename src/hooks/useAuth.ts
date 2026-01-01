import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

/**
 * Custom hook to access authentication context
 *
 * Provides type-safe access to auth state and operations throughout the app.
 * Must be used within an AuthProvider component tree.
 *
 * Usage:
 *   const { isAuthenticated, login, logout, user } = useAuth();
 *
 *   if (isAuthenticated) {
 *     return <div>Welcome, {user?.username}</div>;
 *   }
 *
 * @throws Error if used outside AuthProvider
 * @returns Authentication context value with state and operations
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
        "Wrap your component tree with <AuthProvider> to use authentication features.",
    );
  }

  return context;
};

/**
 * ============================================================================
 * USAGE EXAMPLES
 * ============================================================================
 *
 * Basic Authentication Check:
 * ---------------------------
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return <div>Welcome, {user?.username}!</div>;
 * }
 * ```
 *
 * Login Form:
 * -----------
 * ```tsx
 * function LoginForm() {
 *   const { login, isLoading } = useAuth();
 *   const [error, setError] = useState<string | null>(null);
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     setError(null);
 *
 *     try {
 *       await login(username, password, rememberMe);
 *       // Success - user will be redirected by route protection
 *     } catch (err) {
 *       setError(err.message);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error}</div>}
 *       <input name="username" />
 *       <input name="password" type="password" />
 *       <button disabled={isLoading}>
 *         {isLoading ? 'Logging in...' : 'Login'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * Logout Button:
 * --------------
 * ```tsx
 * function LogoutButton() {
 *   const { logout, user } = useAuth();
 *
 *   return (
 *     <div>
 *       <span>Logged in as: {user?.username}</span>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * Protected Component:
 * --------------------
 * ```tsx
 * function ProtectedFeature() {
 *   const { isAuthenticated, isLoading } = useAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" />;
 *   }
 *
 *   return <SensitiveData />;
 * }
 * ```
 *
 * ============================================================================
 */
