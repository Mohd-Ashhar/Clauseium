// Lookups for risk badge styling, citation status styling, and category
// display names. Mirror of the constants in
// /src/components/uploads/upload-workspace.tsx (lines ~45–114) — kept in
// sync by hand. When the main-app constants change, update this file too.

import type {
  CitationStatus,
  ClassificationLabel,
  RiskLevel,
} from "@addin/types/contract";

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

export function stripCiteTokens(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/\s*\[CITE:[^\]]+\]/gi, "")
    .replace(/\s+\./g, ".")
    .trim();
}
