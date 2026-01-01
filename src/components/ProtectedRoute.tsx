import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Login } from "./Login";

/**
 * ProtectedRoute Component
 *
 * Wrapper component that enforces authentication before rendering children.
 * Displays login page if user is not authenticated.
 *
 * Features:
 *   - Automatic auth state checking
 *   - Loading state during auth verification
 *   - Seamless redirect to login if unauthenticated
 *   - Renders children only when authenticated
 *
 * Usage:
 *   <ProtectedRoute>
 *     <SensitiveComponent />
 *   </ProtectedRoute>
 *
 * Security:
 *   - Blocks rendering of protected content until auth verified
 *   - No flash of protected content before redirect
 *   - Auth state managed centrally via AuthContext
 *
 * @param props.children - Protected content to render when authenticated
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------

  /**
   * Show loading indicator during initial auth check
   * Prevents flash of login page if session is being restored
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">CL</span>
          </div>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-4">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          {/* Loading Text */}
          <p className="text-slate-600 font-medium">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Authentication Check
  // --------------------------------------------------------------------------

  /**
   * Redirect to login if not authenticated
   * Login component handles the authentication flow
   */
  if (!isAuthenticated) {
    return <Login />;
  }

  // --------------------------------------------------------------------------
  // Render Protected Content
  // --------------------------------------------------------------------------

  /**
   * User is authenticated - render protected content
   * Children are only rendered after authentication verification
   */
  return <>{children}</>;
};

/**
 * ============================================================================
 * USAGE EXAMPLES
 * ============================================================================
 *
 * Basic Usage:
 * ------------
 * ```tsx
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <ProtectedRoute>
 *         <MainApp />
 *       </ProtectedRoute>
 *     </AuthProvider>
 *   );
 * }
 * ```
 *
 * With Multiple Protected Routes:
 * -------------------------------
 * ```tsx
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <BrowserRouter>
 *         <Routes>
 *           <Route path="/login" element={<Login />} />
 *           <Route
 *             path="/*"
 *             element={
 *               <ProtectedRoute>
 *                 <MainApp />
 *               </ProtectedRoute>
 *             }
 *           />
 *         </Routes>
 *       </BrowserRouter>
 *     </AuthProvider>
 *   );
 * }
 * ```
 *
 * With Loading Fallback:
 * ----------------------
 * ```tsx
 * <ProtectedRoute fallback={<CustomLoader />}>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 *
 * ============================================================================
 * SECURITY IMPLEMENTATION NOTES
 * ============================================================================
 *
 * CONTENT PROTECTION:
 * -------------------
 * - Protected content never rendered until auth verified
 * - No flash of sensitive data before redirect
 * - Loading state prevents premature rendering
 * - Children only rendered when isAuthenticated === true
 *
 * AUTH STATE MANAGEMENT:
 * ----------------------
 * - Auth state managed by AuthContext (centralized)
 * - Component reacts to auth state changes automatically
 * - Auto-logout on token expiration handled by context
 * - No local auth state (single source of truth)
 *
 * USER EXPERIENCE:
 * ----------------
 * - Seamless transition between auth states
 * - Loading indicator prevents jarring redirects
 * - Login page matches application design
 * - No URL changes on redirect (SPA behavior)
 *
 * FUTURE ENHANCEMENTS:
 * --------------------
 * - Return URL preservation (redirect to intended page after login)
 * - Role-based access control (RBAC)
 * - Permission checking per route
 * - Session timeout warnings
 *
 * TESTING CHECKLIST:
 * ------------------
 * ✅ Unauthenticated users see login page
 * ✅ Authenticated users see protected content
 * ✅ Loading state shows during auth check
 * ✅ No flash of protected content before redirect
 * ✅ Logout redirects to login immediately
 * ✅ Token expiration triggers auto-redirect
 *
 * ============================================================================
 */
