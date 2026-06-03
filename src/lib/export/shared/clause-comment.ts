import type {
  CitationStatus,
  LegalCitation,
  RiskLevel,
} from "@/types/contract";
import { riskLabel } from "./branding";

// The single source of truth for what a "Clauseium AI" clause comment SAYS.
// Consumed by every export surface so they stay in lockstep with each other and
// with the web workspace:
//   • the reconstructed-docx generator (docx library) — docx-redlined.ts
//   • the tracked-changes OOXML injector — ooxml/comments.ts
// Returns ordered paragraph "blocks"; each renderer maps a block → its own
// paragraph/run primitives. Keeping the wording here (not in a renderer) is what
// stops the export drifting from the app the way it had before this pass.

// A single styled run of comment text.
export interface CommentRun {
  text: string;
  bold?: boolean;
}

// A comment paragraph = an ordered list of runs.
export type CommentBlock = CommentRun[];

// Counsel-facing replacement for any internal/engineering phrasing that must
// never reach a downloaded document. Mirrors the now-honest pipeline fallback
// (src/lib/risk/llm-analyzer.ts).
const NEUTRAL_INCONCLUSIVE =
  "Automated review was inconclusive for this clause — please review manually.";

// Honest market-standard line for standard/low-risk clauses. Mirrors the web
// workspace copy (upload-workspace.tsx) — we do NOT claim a benchmark corpus we
// don't compute.
const HONEST_STANDARD =
  "Consistent with common market-standard drafting and our review playbook — no high- or medium-risk issues detected.";

// Legacy persisted rows (analysed before the fallback was made honest) can still
// carry developer-grade error text in risk_issue / risk_explanation. Detect it
// and swap in the neutral line so it can never surface in an exported file,
// regardless of what's stored.
const INTERNAL_PHRASE =
  /unparseable response|risk analyzer returned|legal analysis model|failed to (parse|analyz)|produced an? (unparseable|invalid)/i;

// Engine sentinels that live in risk_rule_ids but are NOT playbook rules to show
// a reviewer.
const INTERNAL_RULE_IDS = new Set(["LLM_PARSE_FAILED"]);

function stripCiteTokens(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s*\[CITE:[^\]]+\]/gi, "").replace(/\s+\./g, ".").trim();
}

// Guard: trim, then map any internal/error phrasing to the neutral line.
export function sanitizeForExport(text: string | null | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  return INTERNAL_PHRASE.test(t) ? NEUTRAL_INCONCLUSIVE : t;
}

// The clause summary line, derived identically wherever an export needs it:
// a sanitized issue if we have one, else an honest level-appropriate fallback.
export function deriveClauseSummary(
  level: RiskLevel,
  issue: string | null | undefined,
): string {
  const clean = sanitizeForExport(stripCiteTokens(issue));
  if (clean) return clean;
  if (level === "missing") return "Required clause not present in this contract.";
  if (level === "standard" || level === "low") return HONEST_STANDARD;
  return "Material risk identified for reviewer attention.";
}

// Playbook rule IDs worth showing a reviewer (engine sentinels removed).
export function displayRuleIds(
  ruleIds: readonly string[] | null | undefined,
): string[] {
  return (ruleIds ?? []).filter((r) => r && !INTERNAL_RULE_IDS.has(r));
}

// "term.no_notice, lol.uncapped +2 more" — first 3, then a count. Mirrors the
// web workspace's playbook-deviation banner.
export function formatRuleIds(ruleIds: readonly string[]): string {
  const shown = ruleIds.slice(0, 3).join(", ");
  const extra = ruleIds.length - 3;
  return extra > 0 ? `${shown} +${extra} more` : shown;
}

const CITATION_STATUS_LABEL: Record<CitationStatus, string> = {
  verified: "verified",
  partially_verified: "partial",
  unverified: "unverified",
};

function citationLine(c: LegalCitation): string {
  return `• ${c.text} (${CITATION_STATUS_LABEL[c.status]})`;
}

function isStandardLevel(level: RiskLevel): boolean {
  return level === "standard" || level === "low";
}

export interface ClauseCommentInput {
  riskLevel: RiskLevel;
  // Already-chosen summary text (e.g. from deriveClauseSummary). Sanitized again
  // here defensively.
  summary: string;
  reasoning?: string | null;
  citations?: LegalCitation[] | null;
  ruleIds?: readonly string[] | null;
}

// Compose the ordered comment blocks for one clause.
export function composeClauseComment(input: ClauseCommentInput): CommentBlock[] {
  const blocks: CommentBlock[] = [];

  // 1. Risk label (bold) — always present.
  blocks.push([{ text: riskLabel(input.riskLevel), bold: true }]);

  // 2. Playbook-deviation flag, for risky clauses that tripped a rule.
  const rules = displayRuleIds(input.ruleIds);
  if (!isStandardLevel(input.riskLevel) && rules.length > 0) {
    blocks.push([
      { text: "Deviates from your playbook", bold: true },
      { text: ` — flagged by ${formatRuleIds(rules)}` },
    ]);
  }

  // 3. Summary (sanitized).
  const summary = sanitizeForExport(input.summary);
  if (summary) blocks.push([{ text: summary }]);

  // 4. Reasoning (cite-stripped + sanitized).
  const reasoning = sanitizeForExport(stripCiteTokens(input.reasoning));
  if (reasoning) {
    blocks.push([{ text: "Reasoning: ", bold: true }, { text: reasoning }]);
  }

  // 5. Citations with honest verification status.
  const citations = input.citations ?? [];
  if (citations.length > 0) {
    blocks.push([{ text: "Citations:", bold: true }]);
    for (const c of citations) blocks.push([{ text: citationLine(c) }]);
  }

  return blocks;
}

// True when a clause has any insight worth a comment beyond a bare "Standard"
// label — used by the tracked-changes path to avoid attaching empty comments to
// boilerplate clauses.
export function clauseHasComment(input: ClauseCommentInput): boolean {
  return composeClauseComment(input).length > 1;
}
