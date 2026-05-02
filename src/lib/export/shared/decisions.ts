import type { ClauseAnalysis } from "@/types/contract";
import type { ClauseState } from "@/components/review/review-context";

export type ExportMode = "redlined" | "clean";

export type Decision =
  | { kind: "original"; text: string; note?: string }
  | { kind: "redline"; from: string; to: string }
  | { kind: "insertion"; text: string }
  | { kind: "drop" }
  | { kind: "manual-edit"; text: string };

export function resolveClauseDecision(
  clause: ClauseAnalysis,
  state: ClauseState | undefined,
  mode: ExportMode,
): Decision {
  const isMissing = clause.riskLevel === "missing";
  const hasRedline = Boolean(clause.suggestedRedline?.trim());

  if (isMissing) {
    if (mode === "redlined") {
      return hasRedline
        ? { kind: "insertion", text: clause.suggestedRedline! }
        : { kind: "drop" };
    }
    if (state === "accepted" && hasRedline) {
      return { kind: "insertion", text: clause.suggestedRedline! };
    }
    return { kind: "drop" };
  }

  if (!hasRedline) {
    return { kind: "original", text: clause.originalText };
  }

  if (mode === "redlined") {
    if (state === "rejected") {
      return {
        kind: "original",
        text: clause.originalText,
        note: "AI suggestion rejected by reviewer.",
      };
    }
    if (state === "modified") {
      return {
        kind: "original",
        text: clause.originalText,
        note: "Reviewer marked this clause as modified — see editor for final text. AI suggestion preserved below for reference.",
      };
    }
    return { kind: "redline", from: clause.originalText, to: clause.suggestedRedline! };
  }

  if (state === "accepted") {
    return { kind: "original", text: clause.suggestedRedline! };
  }
  if (state === "modified") {
    return { kind: "manual-edit", text: clause.originalText };
  }
  return { kind: "original", text: clause.originalText };
}

export function clauseStateLabel(state: ClauseState | undefined): string {
  switch (state) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "modified":
      return "Modified";
    case "pending":
    case undefined:
    default:
      return "Pending review";
  }
}

export function hasModifiedClauses(
  clauses: ClauseAnalysis[],
  states: Record<string, ClauseState>,
): boolean {
  return clauses.some((c) => states[c.id] === "modified");
}
