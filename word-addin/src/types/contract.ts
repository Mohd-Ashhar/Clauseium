// Types shared between the Word add-in and the Clauseium API.
//
// Source of truth for these shapes:
//   - /src/app/api/analysis/[id]/route.ts  (AnalysisClause)
//   - /src/types/contract.ts               (RiskLevel, LegalCitation)
//   - /src/app/api/contracts/by-hash/...   (ByHashResponse)
//
// When the API contract changes, update this file. We deliberately copy
// rather than import across the monorepo boundary because the main app uses
// `server-only` and Next.js modules that wouldn't compile under the add-in's
// webpack build.

export type RiskLevel = "high" | "medium" | "low" | "standard" | "missing";

export type CitationStatus = "verified" | "partially_verified" | "unverified";

export type ClassificationLabel =
  | "indemnification"
  | "limitation_of_liability"
  | "termination"
  | "governing_law"
  | "jurisdiction"
  | "data_protection_dpdp"
  | "payment_terms"
  | "ip_assignment"
  | "other";

export interface LegalCitation {
  id: string;
  text: string;
  source: string;
  section: string;
  status: CitationStatus;
  url?: string;
  warning?: string;
}

export interface AnalysisClassification {
  category: ClassificationLabel;
  confidence: number | null;
  method: string | null;
  matched_rule: string | null;
  reasoning: string | null;
}

export interface AnalysisRisk {
  level: RiskLevel;
  issue: string | null;
  explanation: string | null;
  suggestion: string | null;
  confidence: number | null;
  method: string | null;
  rule_ids: string[] | null;
  analyzed_at: string | null;
}

export interface AnalysisClause {
  id: string;
  section_title: string | null;
  clause_number: string | null;
  position: number | null;
  clause_text: string;
  search_anchor: string | null;
  classification: AnalysisClassification | null;
  risk: AnalysisRisk | null;
  citations: LegalCitation[] | null;
  trust_score: number | null;
}

export type RiskBucket = RiskLevel | "unknown";

export interface AnalysisSummary {
  total_clauses: number;
  by_risk: Record<RiskBucket, number>;
  by_category: Record<ClassificationLabel, number>;
  avg_trust_score: number | null;
  cited_clauses: number;
}

export interface AnalysisResponse {
  contract_id: string;
  status: "queued" | "processing" | "ready" | "failed";
  processed_at: string | null;
  summary: AnalysisSummary;
  clauses: AnalysisClause[];
}

export interface ByHashResponse {
  contractId: string;
  status: "queued" | "processing" | "ready" | "failed";
  title: string;
  processed_at: string | null;
  uploaded_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  token_type: string;
}

export type ClauseActionState = "pending" | "accepted" | "modified" | "rejected";
