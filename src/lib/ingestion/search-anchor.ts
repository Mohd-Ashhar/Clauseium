// Build the value stored in `clauses.search_anchor`. The Word add-in uses this
// short, normalized fingerprint to locate a clause range in the live document
// via Word.js body.search() before applying a tracked-change redline. The
// normalization mirrors migration 0008's SQL backfill so anchors are stable
// whether a row was inserted by this code or rewritten by the migration.
//
// Normalization (order matters):
//   1. strip soft hyphens (U+00AD) — Word renders them invisibly, breaks search
//   2. fold curly quotes to ASCII (' " ) — common in pasted contract text
//   3. collapse whitespace runs to a single space
//   4. trim leading/trailing whitespace
//   5. take the first MAX_LEN chars
//
// MAX_LEN is 150 so we stay under Word's body.search() 255-char ceiling with
// headroom for case/punct quirks the add-in may need to relax.

const MAX_LEN = 150;
const SOFT_HYPHEN = /­/g;
const CURLY_SINGLE = /[‘’]/g;
const CURLY_DOUBLE = /[“”]/g;
const WHITESPACE = /\s+/g;

// Steps 1–4 of the anchor pipeline (NO length slice). Exported so the export
// OOXML engine can normalize full clause text AND the document's plain-text
// projection with byte-identical rules — guaranteeing a stored anchor matches
// what we compute against the live document. computeSearchAnchor() is just this
// plus the 150-char slice.
export function normalizeForAnchor(text: string): string {
  return text
    .replace(SOFT_HYPHEN, "")
    .replace(CURLY_SINGLE, "'")
    .replace(CURLY_DOUBLE, '"')
    .replace(WHITESPACE, " ")
    .trim();
}

export function computeSearchAnchor(clauseText: string): string {
  return normalizeForAnchor(clauseText).slice(0, MAX_LEN);
}
