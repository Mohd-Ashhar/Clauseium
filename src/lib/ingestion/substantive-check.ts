// Decide whether a parsed paragraph is a substantive clause worth sending
// to the risk analyzer LLM. The structure detector ([structure.ts](structure.ts))
// is intentionally permissive — any paragraph >= 20 chars becomes a "clause".
// That's fine for the document viewer (we want to preserve every paragraph
// the user sees in Word) but ships template comments, page markers, and
// bare headings to Claude, where they produce schema-failing prose and
// the user-facing "Risk analyzer returned an unparseable response" fallback.
//
// This helper draws a stricter line for the risk pass only. Non-substantive
// clauses still land in the DB (so the document viewer renders correctly);
// the risk orchestrator just short-circuits them with a NON_SUBSTANTIVE
// rule_id and a null risk payload, which the analysis route then renders
// as no risk at all.

const TEMPLATE_COMMENT_RX = /^\s*\*\*\s/;
const PAGE_MARKER_RX = /^\s*PAGE\s+\d+\s+of\s+\d+\s*$/i;
const ATTACHMENT_MARKER_RX = /^\s*\[(attachment|exhibit|schedule|annex)\b/i;
const BARE_TITLE_RX =
  /^\s*(master\s+services?\s+agreement|services?\s+agreement|non-?disclosure\s+agreement|nda|msa|sow|statement\s+of\s+work)\s*\.?\s*$/i;
const TABLE_OF_CONTENTS_RX = /^\s*table\s+of\s+contents?\s*$/i;
const SIGNATURE_BLOCK_RX = /^\s*(in\s+witness\s+whereof|signed\s+by|signature\s+of\s+the\s+parties)\b/i;

// Tunable thresholds. Anything below these is almost always a heading or
// fragment, not a clause.
const MIN_CHARS = 80;
const MIN_WORDS = 8;
const UPPERCASE_RATIO_CEILING = 0.7;

export interface NonSubstantiveReason {
  code:
    | "empty"
    | "template_comment"
    | "page_marker"
    | "attachment_marker"
    | "bare_title"
    | "table_of_contents"
    | "signature_block"
    | "too_short"
    | "too_few_words"
    | "mostly_uppercase";
  detail?: string;
}

export function isSubstantiveClause(clauseText: string): boolean {
  return classifySubstance(clauseText) === null;
}

// When debugging or logging, prefer this to know WHY a clause was skipped.
export function classifySubstance(
  clauseText: string,
): NonSubstantiveReason | null {
  const text = clauseText.trim();

  if (text.length === 0) return { code: "empty" };
  if (TEMPLATE_COMMENT_RX.test(text)) return { code: "template_comment" };
  if (PAGE_MARKER_RX.test(text)) return { code: "page_marker" };
  if (ATTACHMENT_MARKER_RX.test(text)) return { code: "attachment_marker" };
  if (BARE_TITLE_RX.test(text)) return { code: "bare_title" };
  if (TABLE_OF_CONTENTS_RX.test(text)) return { code: "table_of_contents" };
  if (SIGNATURE_BLOCK_RX.test(text)) return { code: "signature_block" };
  if (text.length < MIN_CHARS) {
    return { code: "too_short", detail: `${text.length} chars` };
  }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS) {
    return { code: "too_few_words", detail: `${wordCount} words` };
  }
  if (uppercaseRatio(text) > UPPERCASE_RATIO_CEILING) {
    return { code: "mostly_uppercase" };
  }

  return null;
}

function uppercaseRatio(s: string): number {
  let letters = 0;
  let upper = 0;
  for (const ch of s) {
    if (/[A-Za-z]/.test(ch)) {
      letters += 1;
      if (ch >= "A" && ch <= "Z") upper += 1;
    }
  }
  if (letters === 0) return 0;
  return upper / letters;
}
