import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ApiErrorResponse } from "./types";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
  withCredentials: false,
});

// ============================================================================
// Authentication Token Management
// ============================================================================

let currentAuthToken: string | null = null;
let authLogoutCallback: (() => void) | null = null;

export const setAuthToken = (token: string | null): void => {
  currentAuthToken = token;
  if (import.meta.env.DEV) {
    console.log("[API Client] Auth token", token ? "set" : "cleared");
  }
};

export const setAuthLogoutCallback = (callback: () => void): void => {
  authLogoutCallback = callback;
};

export const getAuthToken = (): string | null => {
  return currentAuthToken;
};

// ============================================================================
// Enhanced Error Types
// ============================================================================

/**
 * Categorized error types for better error handling
 */
export enum ApiErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMIT = "RATE_LIMIT",
  UNKNOWN = "UNKNOWN",
}

/**
 * Enhanced error object with user-friendly messaging
 */
export interface EnhancedApiError extends AxiosError<ApiErrorResponse> {
  userMessage: string;
  errorType: ApiErrorType;
  isRetryable: boolean;
}

// ============================================================================
// Request Interceptor
// ============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (import.meta.env.DEV) {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
      );
    }

    const isLoginRequest = config.url?.includes("/login");

    if (!isLoginRequest && currentAuthToken) {
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
// Enhanced Response Interceptor
// ============================================================================

apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.data,
      );
    }
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const enhancedError = error as EnhancedApiError;

    // Default values
    enhancedError.errorType = ApiErrorType.UNKNOWN;
    enhancedError.isRetryable = false;
    enhancedError.userMessage =
      "An unexpected error occurred. Please try again.";

    // ========================================================================
    // NETWORK & CONNECTION ERRORS (No response received)
    // ========================================================================
    if (!error.response && error.request) {
      // Request was made but no response received
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        // TIMEOUT ERROR
        enhancedError.errorType = ApiErrorType.TIMEOUT_ERROR;
        enhancedError.isRetryable = true;
        enhancedError.userMessage =
          "Connection timeout. The server took too long to respond. Please try again.";
        console.error("[API Timeout Error] Request exceeded timeout limit");
      } else if (
        error.code === "ERR_NETWORK" ||
        error.code === "ERR_CONNECTION_REFUSED" ||
        error.message.includes("Network Error")
      ) {
        // NETWORK/CONNECTION ERROR
        enhancedError.errorType = ApiErrorType.NETWORK_ERROR;
        enhancedError.isRetryable = true;
        enhancedError.userMessage =
          "Unable to connect to the server. Please check your internet connection and try again.";
        console.error(
          "[API Network Error] Connection refused or network unavailable",
        );
      } else if (error.code === "ERR_NAME_NOT_RESOLVED") {
        // DNS RESOLUTION ERROR
        enhancedError.errorType = ApiErrorType.NETWORK_ERROR;
        enhancedError.isRetryable = false;
        enhancedError.userMessage =
          "Could not reach the server. The server address may be incorrect.";
        console.error("[API DNS Error] Could not resolve server address");
      } else {
        // OTHER REQUEST ERROR
        enhancedError.errorType = ApiErrorType.NETWORK_ERROR;
        enhancedError.isRetryable = true;
        enhancedError.userMessage =
          "Network error occurred. Please check your connection and try again.";
        console.error(
          "[API Request Error] Request made but no response:",
          error.message,
        );
      }
    }
    // ========================================================================
    // HTTP ERROR RESPONSES (Response received with error status)
    // ========================================================================
    else if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Check if response is HTML instead of JSON (proxy/CDN errors)
      const contentType = error.response.headers["content-type"];
      if (contentType && contentType.includes("text/html")) {
        enhancedError.errorType = ApiErrorType.SERVER_ERROR;
        enhancedError.isRetryable = false;
        enhancedError.userMessage =
          "Server error. Please try again later or contact support.";
        console.error("[API Response Error] Received HTML instead of JSON");
        return Promise.reject(enhancedError);
      }

      // Extract error message from response
      const serverMessage =
        data?.error?.message || data?.detail || error.message;

      switch (status) {
        case 401:
          // UNAUTHORIZED
          enhancedError.errorType = ApiErrorType.AUTH_ERROR;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            "Invalid username or password. Please try again.";
          console.error("[API Auth Error] Unauthorized access");

          // Trigger auto-logout if not on login page
          const isLoginRequest = error.config?.url?.includes("/login");
          if (!isLoginRequest && authLogoutCallback) {
            setTimeout(() => {
              authLogoutCallback?.();
            }, 0);
            enhancedError.userMessage =
              "Your session has expired. Please log in again.";
          }
          break;

        case 403:
          // FORBIDDEN
          enhancedError.errorType = ApiErrorType.FORBIDDEN;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            "Access denied. Please contact your administrator if you believe this is an error.";
          console.error("[API Permission Error] Forbidden resource");
          break;

        case 404:
          // NOT FOUND
          enhancedError.errorType = ApiErrorType.NOT_FOUND;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            "The requested resource was not found. Please try again or contact support.";
          console.error("[API Not Found]", error.config?.url);
          break;

        case 422:
          // VALIDATION ERROR
          enhancedError.errorType = ApiErrorType.VALIDATION_ERROR;
          enhancedError.isRetryable = false;
          // Try to extract detailed validation errors
          if (Array.isArray(data?.detail)) {
            const validationErrors = data.detail
              .map((err: any) => err.msg || "")
              .filter(Boolean)
              .join(", ");
            enhancedError.userMessage =
              validationErrors || "Invalid input. Please check your data.";
          } else {
            enhancedError.userMessage =
              serverMessage || "Invalid input. Please check your data.";
          }
          console.error("[API Validation Error]", data?.detail);
          break;

        case 429:
          // RATE LIMIT
          enhancedError.errorType = ApiErrorType.RATE_LIMIT;
          enhancedError.isRetryable = true;
          const retryAfter = error.response.headers["retry-after"];
          const waitTime = retryAfter
            ? `${retryAfter} seconds`
            : "a few minutes";
          enhancedError.userMessage = `Too many requests. Please wait ${waitTime} and try again.`;
          console.error("[API Rate Limit] Too many requests");
          break;

        case 503:
          // SERVICE UNAVAILABLE
          enhancedError.errorType = ApiErrorType.SERVER_ERROR;
          enhancedError.isRetryable = true;
          enhancedError.userMessage =
            "Service temporarily unavailable. Please try again in a few minutes.";
          console.error(
            "[API Service Unavailable] Server is down or overloaded",
          );
          break;

        case 500:
        case 502:
        case 504:
          // SERVER ERRORS
          enhancedError.errorType = ApiErrorType.SERVER_ERROR;
          enhancedError.isRetryable = true;
          enhancedError.userMessage =
            "Server error. Please try again later. If the problem persists, contact support.";
          console.error("[API Server Error]", status, serverMessage);
          break;

        default:
          // OTHER HTTP ERRORS
          enhancedError.errorType = ApiErrorType.UNKNOWN;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            serverMessage ||
            `Request failed with status ${status}. Please try again.`;
          console.error("[API HTTP Error]", status, serverMessage);
      }
    }
    // ========================================================================
    // REQUEST SETUP ERRORS (Error before request was sent)
    // ========================================================================
    else {
      enhancedError.errorType = ApiErrorType.UNKNOWN;
      enhancedError.isRetryable = false;
      enhancedError.userMessage = "Request failed. Please try again.";
      console.error("[API Setup Error]", error.message);
    }

    // Log enhanced error details in development
    if (import.meta.env.DEV) {
      console.error("[API Enhanced Error]", {
        type: enhancedError.errorType,
        message: enhancedError.userMessage,
        isRetryable: enhancedError.isRetryable,
        originalError: error,
      });
    }

    return Promise.reject(enhancedError);
  },
);

export default apiClient;
