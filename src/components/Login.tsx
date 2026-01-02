import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

/**
 * Error display state
 */
interface ErrorState {
  message: string;
  isRetryable: boolean;
  isDismissed: boolean;
}

export const Login: React.FC = () => {
  // --------------------------------------------------------------------------
  // Hooks & State
  // --------------------------------------------------------------------------

  const { login, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Prevent double submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const errorAnnouncerRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  /**
   * Auto-focus username field on mount
   */
  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  /**
   * Check if sessionStorage is available (for "Remember Me" feature)
   */
  useEffect(() => {
    try {
      const testKey = "__storage_test__";
      sessionStorage.setItem(testKey, "test");
      sessionStorage.removeItem(testKey);
    } catch (error) {
      setStorageWarning(
        "Session storage is unavailable (private browsing?). Login will work, but you'll need to sign in again when you close this tab.",
      );
    }
  }, []);

  /**
   * Announce errors to screen readers with delay
   * Ensures ARIA live region is properly updated
   */
  useEffect(() => {
    if (error && !error.isDismissed && errorAnnouncerRef.current) {
      // Small delay to ensure screen reader catches the update
      setTimeout(() => {
        if (errorAnnouncerRef.current) {
          errorAnnouncerRef.current.focus();
        }
      }, 100);
    }
  }, [error]);

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  /**
   * Validate form inputs client-side
   */
  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    // Username validation
    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (username.length > 50) {
      errors.username = "Username is too long (max 50 characters)";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (password.length > 128) {
      errors.password = "Password is too long (max 128 characters)";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  /**
   * Handle form submission with comprehensive error handling
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting || isLoading) {
      console.warn("[Login] Submission blocked: already in progress");
      return;
    }

    // Clear previous errors
    setError(null);
    setValidationErrors({});
    setStorageWarning(null);

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    // Mark as submitting
    setIsSubmitting(true);

    try {
      await login(username.trim(), password, rememberMe);

      // Success - user will be redirected by AuthContext/App
      if (import.meta.env.DEV) {
        console.log("[Login] Login successful");
      }
    } catch (err: any) {
      console.error("[Login] Login failed:", err);

      // Determine error characteristics
      const errorMessage =
        err.message || "An unexpected error occurred. Please try again.";

      // Determine if error is retryable based on message content
      const isRetryable =
        errorMessage.includes("network") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("server") ||
        errorMessage.includes("unavailable");

      // Set error state
      setError({
        message: errorMessage,
        isRetryable,
        isDismissed: false,
      });
      if (!errorMessage || !errorMessage.trim()) {
        console.error("[Login] Empty error message detected, using fallback");
        setError({
          message: "An error occurred during login. Please try again.",
          isRetryable: true,
          isDismissed: false,
        });
      }

      // Check if storage warning should be shown
      if (rememberMe && errorMessage.includes("session persistence failed")) {
        setStorageWarning(
          "Note: Your session could not be saved. You'll need to log in again when you close this tab.",
        );
      }

      // Reset form state for retry
      setPassword(""); // Clear password for security
      usernameInputRef.current?.focus();
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };

  /**
   * Handle username input change
   */
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (validationErrors.username) {
      setValidationErrors((prev) => ({ ...prev, username: undefined }));
    }
    // Clear error when user starts typing
    if (error && !error.isDismissed) {
      setError((prev) => (prev ? { ...prev, isDismissed: true } : null));
    }
  };

  /**
   * Handle password input change
   */
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (validationErrors.password) {
      setValidationErrors((prev) => ({ ...prev, password: undefined }));
    }
    // Clear error when user starts typing
    if (error && !error.isDismissed) {
      setError((prev) => (prev ? { ...prev, isDismissed: true } : null));
    }
  };

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  /**
   * Dismiss error message
   */
  const dismissError = () => {
    setError(null);
  };

  // --------------------------------------------------------------------------
  // Computed Values
  // --------------------------------------------------------------------------

  const isFormDisabled = isLoading || isSubmitting;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">CL</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">CogniLoop</h1>
          <p className="text-slate-600">Expert Annotation Tool</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            Sign In
          </h2>

          {/* Storage Warning (Private Browsing) */}
          {storageWarning && !error && (
            <div
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
              role="alert"
            >
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-amber-800">{storageWarning}</p>
            </div>
          )}

          {/* Error Message */}
          {error && !error.isDismissed && (
            <div
              ref={errorAnnouncerRef}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              tabIndex={-1}
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    {error.message}
                  </p>
                  {error.isRetryable && (
                    <p className="text-xs text-red-600">
                      This error is usually temporary. Please try again.
                    </p>
                  )}
                </div>
                <button
                  onClick={dismissError}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Dismiss error"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Username Field */}
            <div className="mb-5">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Username
              </label>
              <input
                ref={usernameInputRef}
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                disabled={isFormDisabled}
                className={`
                  w-full px-4 py-3 rounded-lg border bg-white text-slate-900
                  transition-all duration-200 focus:outline-none focus:ring-2
                  ${
                    validationErrors.username
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-400 focus:ring-blue-100"
                  }
                  ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}
                  placeholder:text-slate-400
                `}
                placeholder="Enter your username"
                autoComplete="username"
                aria-invalid={!!validationErrors.username}
                aria-describedby={
                  validationErrors.username ? "username-error" : undefined
                }
              />
              {validationErrors.username && (
                <p
                  id="username-error"
                  className="mt-2 text-sm text-red-600"
                  role="alert"
                >
                  {validationErrors.username}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isFormDisabled}
                  className={`
                    w-full px-4 py-3 pr-12 rounded-lg border bg-white text-slate-900
                    transition-all duration-200 focus:outline-none focus:ring-2
                    ${
                      validationErrors.password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-slate-300 focus:border-blue-400 focus:ring-blue-100"
                    }
                    ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}
                    placeholder:text-slate-400
                  `}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!validationErrors.password}
                  aria-describedby={
                    validationErrors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isFormDisabled}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p
                  id="password-error"
                  className="mt-2 text-sm text-red-600"
                  role="alert"
                >
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isFormDisabled}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-2 focus:ring-blue-100 focus:ring-offset-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    Remember me
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Keep me signed in on this device (session cleared on tab
                    close)
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isFormDisabled}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-white
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                ${
                  isFormDisabled
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 active:scale-[0.98] shadow-lg hover:shadow-xl"
                }
              `}
              aria-busy={isFormDisabled}
            >
              {isFormDisabled ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              Your credentials are transmitted securely over HTTPS.
              <br />
              Never share your password with anyone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
