import type { ClauseAnalysis, RiskLevel } from "@/types/contract";
import type { ClauseState } from "../types";

export type ExportMode = "redlined" | "clean";

// ─────────────────────────────────────────────────────────────────────────────
// Canonical resolution (single rule table).
//
// Given a clause's text + the AI suggestion + the reviewer's decision + the
// export mode, decide what should happen to that clause's text in the OUTPUT.
// Both export paths consume this:
//   • the OOXML engine (redlines the ORIGINAL .docx) calls resolveExportText
//     directly and maps `op` → tracked-change / plain-replace / insert / keep.
//   • the reconstructed docx/PDF generators call resolveClauseDecision, which
//     is a thin adapter over resolveExportText returning the richer `Decision`
//     shape those generators already understand.
// Keeping one rule table here means accept/modify/reject behave identically no
// matter which export format the reviewer downloads.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportClauseInput {
  riskLevel: RiskLevel;
  originalText: string;
  suggestedRedline: string | null;
}

export interface ExportActionInput {
  state: ClauseState;
  modifiedText: string | null;
}

export type ExportOp = "replace" | "keep" | "insert" | "drop";

export interface ResolvedExportText {
  // replace → swap the clause's text for newText (tracked change in redlined
  //            mode, plain replacement in clean mode)
  // insert  → a missing clause: insert newText as new content (no original to
  //            delete)
  // drop    → omit entirely (missing clause not being added)
  // keep    → leave the original text untouched
  op: ExportOp;
  newText: string;
  // Reason tag for "keep" so adapters can render the right reviewer note.
  reason?: "rejected" | "modified-no-text";
}

export function resolveExportText(
  clause: ExportClauseInput,
  action: ExportActionInput | undefined,
  mode: ExportMode,
): ResolvedExportText {
  const state: ClauseState = action?.state ?? "pending";
  const modified =
    action?.modifiedText && action.modifiedText.trim().length > 0
      ? action.modifiedText
      : null;
  const suggestion =
    clause.suggestedRedline && clause.suggestedRedline.trim().length > 0
      ? clause.suggestedRedline
      : null;
  const isMissing = clause.riskLevel === "missing";

  // Missing clauses have no original span. Propose them as insertions in the
  // redlined copy (and in the clean copy only once accepted); otherwise drop.
  if (isMissing) {
    if (!suggestion) return { op: "drop", newText: "" };
    if (mode === "redlined") return { op: "insert", newText: suggestion };
    return state === "accepted"
      ? { op: "insert", newText: suggestion }
      : { op: "drop", newText: "" };
  }

  if (state === "rejected") {
    return { op: "keep", newText: clause.originalText, reason: "rejected" };
  }

  if (state === "modified") {
    if (modified) return { op: "replace", newText: modified };
    // Marked modified but no edited text captured — keep original; adapters
    // surface a "needs manual edit" note.
    return {
      op: "keep",
      newText: clause.originalText,
      reason: "modified-no-text",
    };
  }

  // accepted | pending
  if (!suggestion) return { op: "keep", newText: clause.originalText };
  if (state === "accepted") return { op: "replace", newText: suggestion };

  // pending: propose the suggestion as a tracked change in the redlined copy,
  // but never apply an un-reviewed suggestion to the clean (final) copy.
  return mode === "redlined"
    ? { op: "replace", newText: suggestion }
    : { op: "keep", newText: clause.originalText };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter for the reconstructed docx/PDF generators.
// ─────────────────────────────────────────────────────────────────────────────

export type Decision =
  | { kind: "original"; text: string; note?: string }
  | { kind: "redline"; from: string; to: string }
  | { kind: "insertion"; text: string }
  | { kind: "drop" }
  | { kind: "manual-edit"; text: string; needsWork?: boolean };

export function resolveClauseDecision(
  clause: ClauseAnalysis,
  state: ClauseState | undefined,
  mode: ExportMode,
): Decision {
  const resolved = resolveExportText(
    {
      riskLevel: clause.riskLevel,
      originalText: clause.originalText,
      suggestedRedline: clause.suggestedRedline ?? null,
    },
    { state: state ?? "pending", modifiedText: clause.modifiedText ?? null },
    mode,
  );

  switch (resolved.op) {
    case "drop":
      return { kind: "drop" };
    case "insert":
      return { kind: "insertion", text: resolved.newText };
    case "replace":
      if (mode === "redlined") {
        return { kind: "redline", from: clause.originalText, to: resolved.newText };
      }
      // clean: final text applied, no tracking, no "needs work" note.
      return { kind: "manual-edit", text: resolved.newText, needsWork: false };
    case "keep":
    default:
      if (resolved.reason === "rejected") {
        return {
          kind: "original",
          text: clause.originalText,
          note: "AI suggestion rejected by reviewer.",
        };
      }
      if (resolved.reason === "modified-no-text") {
        if (mode === "redlined") {
          return {
            kind: "original",
            text: clause.originalText,
            note: "Reviewer marked this clause as modified — see editor for final text. AI suggestion preserved below for reference.",
          };
        }
        return { kind: "manual-edit", text: clause.originalText, needsWork: true };
      }
      return { kind: "original", text: clause.originalText };
  }
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
