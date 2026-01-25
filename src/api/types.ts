import { Principle, DataRow } from "../types";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

export interface AuthError {
  detail: string | ValidationError[];
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface PrinciplesResponse {
  principles: Principle[];
}

export interface PrincipleResponse {
  principle: Principle;
}

export interface SamplesResponse {
  samples: DataRow[];
  stats: {
    total: number;
    revised: number;
    percentage: number;
  };
}

export interface SampleResponse {
  sample: DataRow;
}

export interface UpdatePrincipleRequest {
  label_name?: string;
  definition?: string;
  inclusion_criteria?: string;
  exclusion_criteria?: string;
}

export interface UpdateSampleOpinionRequest {
  expert_opinion: string;
}

export interface ToggleSampleRevisionRequest {
  is_revised: boolean;
  reviser_name: string;
}

export interface ReassignSampleRequest {
  target_principle_id: string;
  reviser_name: string;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// User Management
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}
