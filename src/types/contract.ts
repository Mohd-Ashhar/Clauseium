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
  | "insurance";

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
  citations: LegalCitation[];
  confidence: number;
  isFromPlaybook: boolean;
  marketPosition: "above" | "at" | "below";
  trustScore?: number;
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

export interface DashboardMetrics {
  contractsInReview: { value: number; trend: number; trendDirection: "up" | "down" };
  avgReviewTime: { value: number; unit: string; trend: number; trendDirection: "up" | "down" };
  riskFlagsResolved: { value: number; period: string };
  playbookAdherence: { value: number; unit: string };
}

export interface ActivityItem {
  id: string;
  user: { name: string; initials: string; color: string };
  action: string;
  target: string;
  timestamp: Date;
  type: "review" | "upload" | "approve" | "comment" | "assign";
}

export interface TopClauseFlag {
  category: ClauseCategory;
  label: string;
  count: number;
  trend: "up" | "down" | "stable";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "reviewer" | "viewer";
  initials: string;
  avatarColor: string;
}
