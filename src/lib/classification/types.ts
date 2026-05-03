import type { ClassificationLabel } from "./categories";

export type ClassificationMethod = "rule" | "llm" | "rule_llm_agree";

export interface ClassificationResult {
  clauseId: string;
  category: ClassificationLabel;
  confidence: number;
  method: ClassificationMethod;
  matchedRule: string | null;
  model: string | null;
  reasoning: string | null;
}

export interface ClauseClassificationRow {
  id: string;
  clause_id: string;
  contract_id: string;
  run_id: string;
  category: ClassificationLabel;
  confidence: number;
  method: ClassificationMethod;
  matched_rule: string | null;
  model: string | null;
  reasoning: string | null;
  classified_at: string;
}

export interface ClauseInput {
  id: string;
  text: string;
}
