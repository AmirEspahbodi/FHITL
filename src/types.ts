export interface DataRow {
  id: string;
  preceding: string;
  target: string;
  following: string;
  A1_Score: number;
  A2_Score: number;
  A3_Score: number;
  principle_id: string; // Changed from number to string
  llm_justification: string;
  llm_evidence_quote: string;
  expert_opinion: string;
  isRevised: boolean;
  reviserName: string | null;
  revisionTimestamp?: string;
}

export interface Principle {
  id: string; // Changed from number to string
  label_name: string;
  definition: string;
  inclusion_criteria: string;
  exclusion_criteria: string;
}

export interface AppState {
  principles: Principle[];
  data: DataRow[];
  selectedPrincipleId: string; // Changed from number to string
}

// Type for the revision action
export interface RevisionUpdate {
  rowId: string;
  isRevised: boolean;
  reviserName: string;
  timestamp: string;
}
