export interface DataRow {
  id: number;
  preceding: string;
  target: string;
  following: string;
  A1_Score: number;
  A2_Score: number;
  A3_Score: number;
  principle_id: number;
  // New columns
  llm_justification: string;
  llm_evidence_quote: string;
  expert_opinion: string;
}

export interface Principle {
  id: number;
  label_name: string;
  definition: string;
  inclusion_criteria: string;
  exclusion_criteria: string;
}

export interface AppState {
  principles: Principle[];
  data: DataRow[];
  selectedPrincipleId: number;
}