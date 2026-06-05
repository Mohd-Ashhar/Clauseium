import { createHash } from "node:crypto";
import type { ExtractedCitation } from "./schemas";

// Structural CITE matcher. Field 1 (case/statute) and field 2 (section/citation)
// may now be EMPTY here — emptiness is judged in code, not by the regex — so that
// a case-law token like `[CITE: Puttaswamy v. Union of India | | 2017]` (no
// reporter in the middle field) is matched rather than silently dropped. A
// non-citation like `[CITE: a | ]` still matches structurally but is rejected
// below (see `structural`), preserving the old "ignores broken brackets" contract.
const CITE_REGEX =
  /\[CITE:\s*([^|\]]*?)\s*\|\s*([^|\]]*?)\s*(?:\|\s*([^\]]*?))?\s*\]/gi;

// A citation is a CASE (as opposed to a statute) when its name carries a party
// separator: "X v. Y", "X vs Y", "X versus Y". Cases are checkable by name+year
// and do NOT require a section, so they follow a different validity rule below.
// Exported so the inline-citation guard can reuse the exact same predicate.
const CASE_REF = /\bv(?:s|ersus)?\.?\s/i;
export function isCaseCitation(name: string): boolean {
  return CASE_REF.test(name);
}

// True only when the entire field is a single 4-digit year in the legal range —
// used to promote a bare year sitting in the section slot of a 2-field case token
// (`[CITE: X vs Y | 2017]`) into the year field.
function bareYear(s: string): number | null {
  const t = s.trim();
  if (!/^\d{4}$/.test(t)) return null;
  const n = Number.parseInt(t, 10);
  return n >= 1800 && n <= 3000 ? n : null;
}

function parseYearField(raw: string): { year: number | null; malformed: boolean } {
  if (raw.length === 0) return { year: null, malformed: false };
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && /^\d{4}$/.test(raw) && parsed >= 1800 && parsed <= 3000) {
    return { year: parsed, malformed: false };
  }
  return { year: null, malformed: true };
}

export function extractCitations(text: string): ExtractedCitation[] {
  if (!text) return [];
  const out: ExtractedCitation[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(CITE_REGEX)) {
    const raw = match[0];
    const caseOrStatute = (match[1] ?? "").trim();
    let sectionOrCitation = (match[2] ?? "").trim();
    const yearRaw = (match[3] ?? "").trim();

    const isCase = isCaseCitation(caseOrStatute);
    const { year: yearFromField3, malformed } = parseYearField(yearRaw);
    let year = yearFromField3;

    // 2-field case token: a bare year that landed in the section slot is the
    // citation year, not a reporter — promote it so the case verifies by year.
    if (isCase && year === null && sectionOrCitation.length > 0) {
      const promoted = bareYear(sectionOrCitation);
      if (promoted !== null) {
        year = promoted;
        sectionOrCitation = "";
      }
    }

    // Keep only tokens that are STRUCTURALLY a citation: a statute/case with a
    // section/reporter (field 1 + field 2 both present), OR a case identified by
    // name + year (section may be empty). This rejects `[CITE: a | ]` and a
    // section-less statute like `[CITE: Some Act | | 2017]` (no statute loosening).
    const structural =
      (caseOrStatute.length > 0 && sectionOrCitation.length > 0) ||
      (isCase && year !== null);
    if (!structural) continue;

    // Validity: a case is checkable by name + (reporter OR year); a statute needs
    // a name AND a section AND, if a year is present, a well-formed one.
    const formatValid = isCase
      ? caseOrStatute.length > 0 && (sectionOrCitation.length > 0 || year !== null)
      : caseOrStatute.length > 0 && sectionOrCitation.length > 0 && !malformed;

    const id = createHash("sha1").update(raw).digest("hex").slice(0, 16);
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      raw,
      caseOrStatute,
      sectionOrCitation,
      year,
      formatValid,
    });
  }

  return out;
}
