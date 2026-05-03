import { createHash } from "node:crypto";
import type { ExtractedCitation } from "./schemas";

// Both first and second captures must contain at least one non-whitespace char.
const CITE_REGEX =
  /\[CITE:\s*((?:[^|\]\s][^|\]]*?)?[^|\]\s])\s*\|\s*((?:[^|\]\s][^|\]]*?)?[^|\]\s])\s*(?:\|\s*([^\]]+?))?\s*\]/gi;

export function extractCitations(text: string): ExtractedCitation[] {
  if (!text) return [];
  const out: ExtractedCitation[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(CITE_REGEX)) {
    const raw = match[0];
    const caseOrStatute = (match[1] ?? "").trim();
    const sectionOrCitation = (match[2] ?? "").trim();
    const yearRaw = (match[3] ?? "").trim();

    let year: number | null = null;
    let formatValid = caseOrStatute.length > 0 && sectionOrCitation.length > 0;

    if (yearRaw.length > 0) {
      const parsed = Number.parseInt(yearRaw, 10);
      if (
        Number.isFinite(parsed) &&
        /^\d{4}$/.test(yearRaw) &&
        parsed >= 1800 &&
        parsed <= 3000
      ) {
        year = parsed;
      } else {
        formatValid = false;
      }
    }

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
