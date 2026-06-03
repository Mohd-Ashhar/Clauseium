// Domain types for Clauseium contract review.
// These are the contract between frontend (mock data + UI) and the future AI backend.

export type RiskLevel = "high" | "medium" | "low" | "standard" | "missing";

export type ReviewStatus =
  | "pending"
  | "in_progress"
  | "reviewed"
  | "needs_attention"
  | "approved"
  | "sent_back";

export type ContractType =
  | "nda"
  | "msa"
  | "sow"
  | "saas_agreement"
  | "employment"
  | "vendor_agreement"
  | "consulting"
  | "partnership"
  | "license";

export type ClauseCategory =
  | "governing_law"
  | "jurisdiction"
  | "arbitration"
  | "indemnification"
  | "limitation_of_liability"
  | "termination"
  | "ip_assignment"
  | "confidentiality"
  | "data_protection_dpdp"
  | "payment_terms"
  | "non_compete"
  | "non_solicitation"
  | "force_majeure"
  | "representations_warranties"
  | "insurance"
  // Uncategorized clauses. Without this, the workspace was forced to mislabel
  // every "other" clause as "confidentiality" in exports.
  | "other";

export type CitationStatus = "verified" | "partially_verified" | "unverified";

export interface LegalCitation {
  id: string;
  text: string;
  source: string;
  section: string;
  status: CitationStatus;
  url?: string;
  warning?: string;
}

export interface ClauseAnalysis {
  id: string;
  clauseNumber: string;
  category: ClauseCategory;
  title: string;
  originalText: string;
  riskLevel: RiskLevel;
  summary: string;
  reasoning: string;
  suggestedRedline?: string;
  // Reviewer-edited redline wording (the "Modify" workflow). When present it is
  // used verbatim by the export engines in place of suggestedRedline.
  modifiedText?: string;
  citations: LegalCitation[];
  confidence: number;
  isFromPlaybook: boolean;
  // Playbook rule IDs this clause tripped (e.g. "term.no_notice"). Drives the
  // "Deviates from your playbook" framing in exports. Optional so non-export
  // consumers that build ClauseAnalysis don't have to supply it.
  ruleIds?: string[];
  marketPosition: "above" | "at" | "below";
  trustScore?: number;
  issue?: string;
}

// Whole-document analysis (Phase 1). Mirrors the persisted jsonb written by
// src/lib/risk/document-analyzer.ts. Kept here (not imported from the
// server-only analyzer) so client components can consume it.
export interface DocMissingProtection {
  key: string;
  label: string;
  riskLevel: RiskLevel;
  rationale: string;
  suggestedClause: string;
}

export interface DocCrossClauseIssue {
  title: string;
  riskLevel: RiskLevel;
  clausePositions: number[];
  explanation: string;
  recommendation: string;
}

export interface DocOneSidedTerm {
  title: string;
  riskLevel: RiskLevel;
  clausePosition: number | null;
  explanation: string;
  recommendation: string;
}

export interface DocumentAnalysisView {
  contractType: string;
  contractTypeLabel: string;
  contractTypeConfidence: number;
  executiveSummary: string;
  overallPosture: "favourable" | "balanced" | "unfavourable" | "high_risk";
  missingProtections: DocMissingProtection[];
  crossClauseIssues: DocCrossClauseIssue[];
  oneSidedTerms: DocOneSidedTerm[];
  model: string;
  degraded: boolean;
}

export interface RiskSummary {
  high: number;
  medium: number;
  low: number;
  standard: number;
  missing: number;
  overallScore: number;
  escalationRecommended: boolean;
  escalationReason?: string;
}

export interface DocumentHighlight {
  text: string;
  riskLevel: RiskLevel;
}

export interface DocumentSection {
  sectionNumber: string;
  title: string;
  content: string;
  clauseId?: string;
  riskLevel?: RiskLevel;
  highlights?: DocumentHighlight[];
  isHeading?: boolean;
}

export interface Contract {
  id: string;
  title: string;
  counterparty: string;
  contractType: ContractType;
  jurisdiction: string;
  governingLaw: string;
  status: ReviewStatus;
  riskSummary: RiskSummary;
  totalClauses: number;
  reviewedClauses: number;
  assignedTo?: string;
  uploadedBy: string;
  uploadedAt: Date;
  lastUpdated: Date;
  version: number;
  fileSize: string;
  pageCount: number;
  tags: string[];
  clauses?: ClauseAnalysis[];
  documentSections?: DocumentSection[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "reviewer" | "viewer";
  initials: string;
  avatarColor: string;
}
