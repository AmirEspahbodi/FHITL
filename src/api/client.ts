import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { ApiErrorResponse } from "./types";

// ============================================================================
// TypeScript Extensions & Types
// ============================================================================

// Extend Axios config to include metadata for timing
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

// ============================================================================
// Logging & Sanitization Utilities
// ============================================================================

const SENSITIVE_KEYS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "secret",
  "creditCard",
];

/**
 * Recursively redacts sensitive keys in objects or arrays.
 * Returns a deep copy to avoid mutating the original request data.
 */
const redactData = (data: any): any => {
  if (!data) return data;
  if (typeof data === "string") return data; // Can't parse raw strings easily
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactData(item));
  }

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = redactData(sanitized[key]);
    }
  }

  return sanitized;
};

const consoleStyles = {
  request:
    "color: #3b82f6; font-weight: bold; background: #eff6ff; padding: 2px 5px; border-radius: 2px;",
  success:
    "color: #22c55e; font-weight: bold; background: #f0fdf4; padding: 2px 5px; border-radius: 2px;",
  error:
    "color: #ef4444; font-weight: bold; background: #fef2f2; padding: 2px 5px; border-radius: 2px;",
  info: "color: #6b7280; font-weight: normal;",
};

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3333/api/v1";

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
    console.log(
      `%c[Auth] Token ${token ? "Set" : "Cleared"}`,
      consoleStyles.info,
    );
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
    // 1. Add Timing Metadata
    config.metadata = { startTime: Date.now() };

    // 2. Inject Auth Token
    const isLoginRequest = config.url?.includes("/login");
    if (!isLoginRequest && currentAuthToken) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${currentAuthToken}`;
      }
    }

    // 3. Logging (Dev Only)
    if (import.meta.env.DEV) {
      const { method, url, params, data, headers } = config;

      console.groupCollapsed(
        `%c🚀 Request%c ${method?.toUpperCase()} ${url}`,
        consoleStyles.request,
        "color: inherit; font-weight: normal;",
      );

      console.log(`%cTimestamp:`, consoleStyles.info, new Date().toISOString());

      // Sanitize Headers
      const sanitizedHeaders = redactData({ ...headers });
      console.log(`%cHeaders:`, consoleStyles.info, sanitizedHeaders);

      if (params) {
        console.log(`%cQuery Params:`, consoleStyles.info, redactData(params));
      }

      if (data) {
        console.log(`%cBody:`, consoleStyles.info, redactData(data));
      }

      console.groupEnd();
    }

    return config;
  },
  (error: AxiosError) => {
    console.error(
      "%c[Request Setup Error]",
      consoleStyles.error,
      error.message,
    );
    return Promise.reject(error);
  },
);

// ============================================================================
// Enhanced Response Interceptor
// ============================================================================

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 1. Calculate Duration
    const startTime = response.config.metadata?.startTime || Date.now();
    const duration = Date.now() - startTime;

    // 2. Logging (Dev Only)
    if (import.meta.env.DEV) {
      const { status, config, data } = response;
      const method = config.method?.toUpperCase();
      const url = config.url;

      console.groupCollapsed(
        `%c✅ Success%c ${status} ${method} ${url} %c(${duration}ms)`,
        consoleStyles.success,
        "color: inherit; font-weight: normal;",
        consoleStyles.info,
      );

      console.log(`%cData:`, consoleStyles.info, data);
      console.groupEnd();
    }

    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const enhancedError = error as EnhancedApiError;
    const config = error.config as InternalAxiosRequestConfig;

    // 1. Calculate Duration
    const startTime = config?.metadata?.startTime || Date.now();
    const duration = Date.now() - startTime;

    // 2. Logging (Dev Only)
    if (import.meta.env.DEV) {
      const status = error.response?.status || "N/A";
      const method = config?.method?.toUpperCase() || "UNKNOWN";
      const url = config?.url || "UNKNOWN";

      console.groupCollapsed(
        `%c🚨 Error%c ${status} ${method} ${url} %c(${duration}ms)`,
        consoleStyles.error,
        "color: inherit; font-weight: normal;",
        consoleStyles.info,
      );

      console.log(`%cMessage:`, consoleStyles.info, error.message);
      if (error.response?.data) {
        console.log(
          `%cResponse Data:`,
          consoleStyles.info,
          error.response.data,
        );
      }
      console.groupEnd();
    }

    // Default Error Values
    enhancedError.errorType = ApiErrorType.UNKNOWN;
    enhancedError.isRetryable = false;
    enhancedError.userMessage =
      "An unexpected error occurred. Please try again.";

    // ========================================================================
    // NETWORK & CONNECTION ERRORS (No response received)
    // ========================================================================
    if (!error.response && error.request) {
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        enhancedError.errorType = ApiErrorType.TIMEOUT_ERROR;
        enhancedError.isRetryable = true;
        enhancedError.userMessage =
          "Connection timeout. The server took too long to respond. Please try again.";
      } else if (
        error.code === "ERR_NETWORK" ||
        error.code === "ERR_CONNECTION_REFUSED" ||
        error.message.includes("Network Error")
      ) {
        enhancedError.errorType = ApiErrorType.NETWORK_ERROR;
        enhancedError.isRetryable = true;
        enhancedError.userMessage =
          "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error.code === "ERR_NAME_NOT_RESOLVED") {
        enhancedError.errorType = ApiErrorType.NETWORK_ERROR;
        enhancedError.isRetryable = false;
        enhancedError.userMessage =
          "Could not reach the server. The server address may be incorrect.";
      } else {
        enhancedError.errorType = ApiErrorType.NETWORK_ERROR;
        enhancedError.isRetryable = true;
        enhancedError.userMessage =
          "Network error occurred. Please check your connection and try again.";
      }
    }
    // ========================================================================
    // HTTP ERROR RESPONSES (Response received with error status)
    // ========================================================================
    else if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      const contentType = error.response.headers["content-type"];
      if (contentType && contentType.includes("text/html")) {
        enhancedError.errorType = ApiErrorType.SERVER_ERROR;
        enhancedError.isRetryable = false;
        enhancedError.userMessage =
          "Server error. Please try again later or contact support.";
        return Promise.reject(enhancedError);
      }

      const serverMessage =
        data?.error?.message || data?.detail || error.message;

      switch (status) {
        case 400:
          enhancedError.errorType = ApiErrorType.VALIDATION_ERROR;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            data?.detail || "Invalid request. Please check your inputs.";
          break;
        case 401:
          enhancedError.errorType = ApiErrorType.AUTH_ERROR;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            "Invalid username or password. Please try again.";

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
          enhancedError.errorType = ApiErrorType.FORBIDDEN;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            "Access denied. Please contact your administrator if you believe this is an error.";
          break;

        case 404:
          enhancedError.errorType = ApiErrorType.NOT_FOUND;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            "The requested resource was not found. Please try again or contact support.";
          break;

        case 422:
          enhancedError.errorType = ApiErrorType.VALIDATION_ERROR;
          enhancedError.isRetryable = false;
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
          break;

        case 429:
          enhancedError.errorType = ApiErrorType.RATE_LIMIT;
          enhancedError.isRetryable = true;
          const retryAfter = error.response.headers["retry-after"];
          const waitTime = retryAfter
            ? `${retryAfter} seconds`
            : "a few minutes";
          enhancedError.userMessage = `Too many requests. Please wait ${waitTime} and try again.`;
          break;

        case 503:
          enhancedError.errorType = ApiErrorType.SERVER_ERROR;
          enhancedError.isRetryable = true;
          enhancedError.userMessage =
            "Service temporarily unavailable. Please try again in a few minutes.";
          break;

        case 500:
        case 502:
        case 504:
          enhancedError.errorType = ApiErrorType.SERVER_ERROR;
          enhancedError.isRetryable = true;
          enhancedError.userMessage =
            "Server error. Please try again later. If the problem persists, contact support.";
          break;

        default:
          enhancedError.errorType = ApiErrorType.UNKNOWN;
          enhancedError.isRetryable = false;
          enhancedError.userMessage =
            serverMessage ||
            `Request failed with status ${status}. Please try again.`;
      }
    }

    return Promise.reject(enhancedError);
  },
);

export default apiClient;
