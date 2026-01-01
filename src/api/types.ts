import { Principle, DataRow } from "../types";

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Request payload for user login
 * Endpoint: POST /api/v1/login/access-token
 */
export interface LoginRequest {
  /** User's username */
  username: string;
  /** User's password (transmitted over HTTPS only) */
  password: string;
}

/**
 * Response structure for successful authentication
 * Endpoint: POST /api/v1/login/access-token
 */
export interface LoginResponse {
  /** JWT access token for API authentication */
  access_token: string;
  /** Token type (always "bearer" for JWT) */
  token_type: string;
}

/**
 * Validation error detail structure
 * Returned in 422 responses from FastAPI/Pydantic
 */
export interface ValidationError {
  /** Location of the error (e.g., ["body", "username"]) */
  loc: string[];
  /** Human-readable error message */
  msg: string;
  /** Error type identifier (e.g., "value_error.missing") */
  type: string;
}

/**
 * Authentication error response structure
 * Returned for 401 (unauthorized) and 422 (validation) errors
 */
export interface AuthError {
  /** Error message or array of validation errors */
  detail: string | ValidationError[];
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Response structure for fetching all principles
 * Endpoint: GET /api/v1/principles
 */
export interface PrinciplesResponse {
  principles: Principle[];
}

/**
 * Response structure for fetching a single principle
 * Endpoint: GET /api/v1/principles/:id
 */
export interface PrincipleResponse {
  principle: Principle;
}

/**
 * Response structure for fetching samples by principle
 * Endpoint: GET /api/v1/principles/:principleId/samples
 * Includes pagination metadata and revision statistics
 */
export interface SamplesResponse {
  samples: DataRow[];
  stats: {
    total: number;
    revised: number;
    percentage: number;
  };
}

/**
 * Response structure for single sample operations
 * Used by: PATCH /samples/:id/opinion, /revision, /reassign
 */
export interface SampleResponse {
  sample: DataRow;
}

// ============================================================================
// Request Payloads
// ============================================================================

/**
 * Payload for updating principle metadata
 * Endpoint: PATCH /api/v1/principles/:id
 * All fields are optional (partial update)
 */
export interface UpdatePrincipleRequest {
  label_name?: string;
  definition?: string;
  inclusion_criteria?: string;
  exclusion_criteria?: string;
}

/**
 * Payload for updating expert opinion on a sample
 * Endpoint: PATCH /api/v1/samples/:id/opinion
 */
export interface UpdateSampleOpinionRequest {
  expert_opinion: string;
}

/**
 * Payload for marking a sample as revised/unrevised
 * Endpoint: PATCH /api/v1/samples/:id/revision
 */
export interface ToggleSampleRevisionRequest {
  is_revised: boolean;
  reviser_name: string;
}

/**
 * Payload for reassigning a sample to a different principle
 * Endpoint: PATCH /api/v1/samples/:id/reassign
 * Automatically marks sample as revised
 */
export interface ReassignSampleRequest {
  target_principle_id: number;
  reviser_name: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response structure from backend
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}
