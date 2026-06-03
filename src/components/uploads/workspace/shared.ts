// Shared types + styling constants for the contract-review workspace.
// Pure data (no JSX), so it's safe to import from client components, the
// composition root, and node-environment unit tests alike.
import type {
  ClassificationLabel,
  ClassificationMethod,
} from "@/lib/classification";
import type { RiskMethod } from "@/lib/risk";
import type {
  CitationStatus,
  DocumentAnalysisView,
  LegalCitation,
  RiskLevel,
} from "@/types/contract";
import type { StructuredDocument } from "@/types/ingestion";
import type { ClauseActionState } from "../clause-actions";

export type ExportFormat = "redlined" | "clean" | "summary" | "full";
export type ViewMode = "redlined" | "original" | "clean";
export type FilterLevel = "all" | "high" | "medium" | "standard" | "missing";

// Per-clause editor state, kept alongside the clause's action state. Tracks the
// reviewer's edited redline text plus the in-flight save status.
export interface ClauseEdit {
  modifiedText: string | null;
  saving: boolean;
  error: string | null;
}

export const EMPTY_EDIT: ClauseEdit = {
  modifiedText: null,
  saving: false,
  error: null,
};

export interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "info";
}

export interface ClauseWorkspaceItem {
  id: string;
  position: number;
  text: string;
  sectionTitle: string;
  classification: {
    category: ClassificationLabel;
    confidence: number;
    method: ClassificationMethod;
  } | null;
  risk: {
    level: RiskLevel;
    issue: string | null;
    explanation: string | null;
    suggestion: string | null;
    confidence: number | null;
    method: RiskMethod | null;
    ruleIds: string[];
  } | null;
  citations: LegalCitation[];
  trustScore: number | null;
  action: ClauseActionState;
  actionNote: string | null;
  actionModifiedText: string | null;
}

export interface WorkspaceSummary {
  high: number;
  medium: number;
  missing: number;
  low: number;
  standard: number;
  totalClauses: number;
  verifiedCitations: number;
  partialCitations: number;
  droppedCitations: number;
  overallTrust: number | null;
  overallRiskScore: number; // 0–100
}

export interface UploadWorkspaceProps {
  contractId: string;
  contractTitle: string;
  originalFilename: string;
  pageCount: number | null;
  structured: StructuredDocument;
  clauses: ClauseWorkspaceItem[];
  summary: WorkspaceSummary;
  documentAnalysis?: DocumentAnalysisView | null;
  partial?: boolean;
  analysisNotes?: string[];
}

export const CATEGORY_LABELS: Record<ClassificationLabel, string> = {
  indemnification: "Indemnification",
  limitation_of_liability: "Limitation of Liability",
  termination: "Termination",
  governing_law: "Governing Law",
  jurisdiction: "Jurisdiction",
  data_protection_dpdp: "DPDP / Data Protection",
  payment_terms: "Payment Terms",
  ip_assignment: "IP Assignment",
  other: "Other",
};

export const RISK_RANK: Record<RiskLevel, number> = {
  high: 0,
  missing: 1,
  medium: 2,
  low: 3,
  standard: 3,
};

export const ACCENT_BORDER: Record<RiskLevel, string> = {
  high: "border-l-4 border-l-risk-high",
  medium: "border-l-4 border-l-risk-med",
  missing: "border-l-4 border-l-risk-info",
  low: "border-l-4 border-l-risk-low",
  standard: "border-l-4 border-l-risk-low",
};

export const RISK_BADGE: Record<
  RiskLevel,
  { tone: string; dot: string; label: string }
> = {
  high: {
    tone: "bg-risk-high/15 text-risk-high border-risk-high/30",
    dot: "bg-risk-high",
    label: "High",
  },
  medium: {
    tone: "bg-risk-med/15 text-risk-med border-risk-med/30",
    dot: "bg-risk-med",
    label: "Medium",
  },
  missing: {
    tone: "bg-risk-info/15 text-risk-info border-risk-info/30",
    dot: "bg-risk-info",
    label: "Missing",
  },
  low: {
    tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
    dot: "bg-risk-low",
    label: "Low",
  },
  standard: {
    tone: "bg-risk-low/15 text-risk-low border-risk-low/30",
    dot: "bg-risk-low",
    label: "Standard",
  },
};

export const CITATION_TONES: Record<CitationStatus, string> = {
  verified: "bg-risk-low/10 text-risk-low border-risk-low/30",
  partially_verified: "bg-risk-med/10 text-risk-med border-risk-med/30",
  unverified: "bg-risk-high/10 text-risk-high border-risk-high/30",
};

export const CITATION_LABELS: Record<CitationStatus, string> = {
  verified: "verified",
  partially_verified: "partial",
  unverified: "unverified",
};

export const POSTURE_META: Record<
  DocumentAnalysisView["overallPosture"],
  { label: string; tone: string }
> = {
  favourable: { label: "Favourable", tone: "bg-risk-low/15 text-risk-low" },
  balanced: { label: "Balanced", tone: "bg-risk-info/15 text-risk-info" },
  unfavourable: { label: "Unfavourable", tone: "bg-risk-med/15 text-risk-med" },
  high_risk: { label: "High risk", tone: "bg-risk-high/15 text-risk-high" },
};
