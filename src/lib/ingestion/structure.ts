import { randomUUID } from "node:crypto";
import type { Section, StructuredDocument } from "@/types/ingestion";

// Real document sections (ARTICLE/SECTION/SCHEDULE …) and standalone headings.
const SECTION_HEADER_REGEX =
  /^\s*(?:(SECTION|ARTICLE|PART|SCHEDULE|ANNEXURE|EXHIBIT)\s+)([IVXLCDM]+|\d+)(?:\s*[-–:.]\s*(.+))?$/i;
const ALLCAPS_HEADER_REGEX = /^\s*([A-Z][A-Z0-9 &,'\-/]{4,79})\s*$/;
// A candidate TOP-LEVEL numbered clause: a 1–3 digit number, an optional "."
// or ")", then a space and body. Bounded to 3 digits so phone numbers and
// amounts can't masquerade as clause 12345. We accept "5." and "5)" alike
// because Indian drafting mixes both for the same level.
const TOP_NUMBER_REGEX = /^\s*(\d{1,3})\s*[.)]\s+(\S.*)$/;
// Decimal sub-clause "14.1", "14.1.2 …" — group 1 is the parent top number.
const DECIMAL_SUB_REGEX = /^\s*(\d{1,3})\.(\d+)(?:\.\d+)*\s*[.)]?\s+\S/;
// Lettered / roman sub-clause: "a)", "(a)", "ii)", "(iv)". Letters are NEVER a
// top-level clause, so these always fold into the current clause.
const LETTERED_SUB_REGEX = /^\s*\(?([a-z]{1,4})\)\s+\S/i;
const PREAMBLE_REGEX = /^\s*(WHEREAS|NOW,?\s*THEREFORE|IN\s+WITNESS\s+WHEREOF|RECITALS?)\b/i;
const SIGNATURE_BLOCK_REGEX =
  /^\s*(For\s+and\s+on\s+behalf\s+of|Authorised\s+Signator(y|ies)|_{5,}|Name\s*:\s*$|Designation\s*:\s*$|Date\s*:\s*$)/i;
// Execution-verb cues are matched CASE-SENSITIVELY (must be capitalised) so a
// mid-clause prose tail like "…duly executed by both the parties." is NOT
// mistaken for a signature block — that bug used to swallow every clause after
// it. Real execution headers are "EXECUTED BY", "Executed as a deed", "SIGNED".
const SIGNATURE_BLOCK_CASED_REGEX = /^\s*(SIGNED|Signed|EXECUTED|Executed)\s+(AS|BY|as|by)\b/;
// Schedules, annexures, exhibits and appendices routinely sit AFTER the
// signature block yet carry the most negotiated commercial terms (pricing,
// SLAs, SOWs, data-processing terms). We use this to RESUME parsing once a
// signature block has been seen, instead of discarding the rest of the file.
const SCHEDULE_RESUME_REGEX =
  /^\s*(SCHEDULE|ANNEXURE|ANNEX|EXHIBIT|APPENDIX|ADDENDUM)\b/i;

const MIN_CLAUSE_LENGTH = 20;
// How far ahead of the last accepted clause number we'll still treat a numbered
// line as a genuine new clause (covers a single missed/merged heading) when it
// also looks like a heading. A pure next-in-sequence number is always accepted.
const FORWARD_WINDOW = 2;

interface PendingClause {
  numInt: number | null; // parsed top-level number, null for preamble/synthetic.
  heading: string | null; // short caption on the clause's first line, if any.
  lines: string[]; // every raw line folded into this clause (incl. sub-clauses).
}

export function detectStructure(text: string): StructuredDocument {
  const lines = text.split("\n");
  const clauses: PendingClause[] = [];
  let current: PendingClause | null = null;
  let lastTopNumber = 0;
  let pendingSectionTitle: string | null = null; // set by a real header, claimed by next headingless clause.
  let prevBlank = true;
  let inSignatureZone = false;

  const flush = () => {
    if (current && joinLines(current.lines).trim().length > 0) {
      clauses.push(current);
    }
    current = null;
  };

  const startClause = (c: PendingClause) => {
    flush();
    current = c;
  };

  const appendLine = (line: string) => {
    if (!current) {
      // Un-numbered lead content (parties block, recitals) before clause 1.
      current = { numInt: null, heading: null, lines: [line] };
    } else {
      current.lines.push(line);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Once inside a signature block, skip boilerplate (party names, dates,
    // signature lines) BUT keep scanning: resume the moment a
    // schedule/annexure/exhibit or a new top-level section begins, so
    // post-signature commercial terms are no longer silently dropped.
    if (inSignatureZone) {
      if (SCHEDULE_RESUME_REGEX.test(line) || SECTION_HEADER_REGEX.test(line)) {
        inSignatureZone = false;
        prevBlank = true;
        // fall through to normal handling for this header line
      } else {
        continue;
      }
    }

    if (SIGNATURE_BLOCK_REGEX.test(line) || SIGNATURE_BLOCK_CASED_REGEX.test(line)) {
      flush();
      inSignatureZone = true;
      continue;
    }

    if (line.trim().length === 0) {
      if (current) current.lines.push("");
      prevBlank = true;
      continue;
    }

    // --- Real section headers: set context only, never a clause. ---
    const sectionMatch = SECTION_HEADER_REGEX.exec(line);
    if (sectionMatch) {
      flush();
      const kind = sectionMatch[1];
      const num = sectionMatch[2];
      const heading = sectionMatch[3]?.trim();
      pendingSectionTitle = heading
        ? `${capitalize(kind)} ${num} — ${heading}`
        : `${capitalize(kind)} ${num}`;
      // Schedules/annexures restart numbering — don't let their "1." fold.
      if (RENUMBER_RESTART_KINDS.has(kind.toUpperCase())) lastTopNumber = 0;
      prevBlank = false;
      continue;
    }

    if (PREAMBLE_REGEX.test(line)) {
      startClause({ numInt: null, heading: "Preamble", lines: [line.trim()] });
      prevBlank = false;
      continue;
    }

    // --- Decimal sub-clause "x.y": fold into its parent. ---
    const decimalMatch = DECIMAL_SUB_REGEX.exec(line);
    if (decimalMatch && !looksLikeDateOrAmount(line)) {
      const parent = Number.parseInt(decimalMatch[1], 10);
      if (current && current.numInt === parent) {
        appendLine(line.trim());
      } else if (parent > lastTopNumber) {
        // A pure-decimal contract (1.1, 1.2, 2.1 …) with no bare "1." headings:
        // the first decimal of a new major number opens that top-level clause.
        startClause({ numInt: parent, heading: null, lines: [line.trim()] });
        lastTopNumber = parent;
        pendingSectionTitle = null;
      } else {
        appendLine(line.trim());
      }
      prevBlank = false;
      continue;
    }

    // --- Lettered / roman sub-clause "a)", "(iv)": always fold. ---
    if (LETTERED_SUB_REGEX.test(line)) {
      appendLine(line.trim());
      prevBlank = false;
      continue;
    }

    // --- Candidate top-level numbered clause. ---
    const numberedMatch = TOP_NUMBER_REGEX.exec(line);
    if (numberedMatch && !looksLikeDateOrAmount(line)) {
      const n = Number.parseInt(numberedMatch[1], 10);
      const rest = numberedMatch[2];
      const startsLower = /^[a-z]/.test(rest); // continuation fragment ("9 of this agreement…")
      const headingLike = isHeadingLike(rest);
      const sentenceLike = /^[A-Z]/.test(rest.trim());
      const inSequence = n === lastTopNumber + 1;
      const inWindow = n > lastTopNumber && n <= lastTopNumber + FORWARD_WINDOW;
      // The very first numbered clause establishes the baseline — it may not be
      // "1" if the opening heading was merged upstream. Accept a modest, capital-
      // led number to seed the sequence; everything after follows the run.
      const isFirst = lastTopNumber === 0;

      const acceptAsNewTop =
        n > lastTopNumber && // never re-open a number we've already passed (kills duplicate 1/2/9/25)
        !startsLower && // never start a clause from a mid-sentence fragment
        (inSequence ||
          (inWindow && headingLike) ||
          (isFirst && n <= 30 && (headingLike || sentenceLike)));

      if (acceptAsNewTop) {
        startClause({
          numInt: n,
          heading: extractHeading(rest),
          lines: [`${n}. ${rest.trim()}`],
        });
        lastTopNumber = n;
        pendingSectionTitle = null;
      } else {
        appendLine(line.trim());
      }
      prevBlank = false;
      continue;
    }

    // --- Standalone ALL-CAPS heading on its own line: section context. ---
    const allcapsMatch = ALLCAPS_HEADER_REGEX.exec(line);
    if (allcapsMatch && prevBlank) {
      flush();
      pendingSectionTitle = titleCase(allcapsMatch[1].trim());
      prevBlank = false;
      continue;
    }

    // --- Plain prose: continuation/body of the current clause. ---
    if (!current && pendingSectionTitle) {
      // First body line after a bare section header opens a clause for it.
      current = { numInt: null, heading: pendingSectionTitle, lines: [line.trim()] };
      pendingSectionTitle = null;
    } else {
      appendLine(line.trim());
    }
    prevBlank = false;
  }

  flush();

  return assembleDocument(clauses);
}

const RENUMBER_RESTART_KINDS = new Set([
  "SCHEDULE",
  "ANNEXURE",
  "ANNEX",
  "EXHIBIT",
  "APPENDIX",
  "ADDENDUM",
]);

// Build the flat StructuredDocument. Each top-level clause becomes one Clause;
// its folded sub-clauses live inside `text`. Clauses are grouped into Sections
// by title, merging consecutive same-titled runs so a multi-fragment preamble
// doesn't explode into many identical sections.
function assembleDocument(pending: PendingClause[]): StructuredDocument {
  let position = 0;
  const sections: Section[] = [];

  for (const c of pending) {
    const body = joinLines(c.lines).trim();
    if (body.length < MIN_CLAUSE_LENGTH) continue;
    const title = clauseTitle(c);
    const clause = { id: randomUUID(), text: body, position: position++ };

    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.clauses.push(clause);
    } else {
      sections.push({ title, clauses: [clause] });
    }
  }

  if (sections.length === 0) {
    return paragraphFallback();
  }
  return { sections };

  // Fallback path: the detector found no clause boundaries (heavily-formatted
  // templates, table/textbox-only docs, or upstream parsing that lost paragraph
  // breaks). Split on paragraph breaks so the analyzer still sees real
  // provisions instead of one giant non-substantive blob.
  function paragraphFallback(): StructuredDocument {
    const source = pending.map((c) => joinLines(c.lines)).join("\n").trim();
    console.warn(
      `[ingestion] structure detector found 0 clauses in ${source.length} chars — falling back to paragraph chunks`,
    );
    const candidates =
      source.split(/\n\s*\n/).length > 1 ? source.split(/\n\s*\n/) : source.split(/\n/);
    const paragraphs = candidates
      .map((p) => p.replace(/[ \t]+/g, " ").trim())
      .filter((p) => p.length >= MIN_CLAUSE_LENGTH);

    if (paragraphs.length === 0) {
      return {
        sections: [
          {
            title: "Body",
            clauses: [{ id: randomUUID(), text: source.slice(0, 4000), position: 0 }],
          },
        ],
      };
    }
    return {
      sections: [
        {
          title: "Body",
          clauses: paragraphs.map((p, i) => ({ id: randomUUID(), text: p, position: i })),
        },
      ],
    };
  }
}

function clauseTitle(c: PendingClause): string {
  if (c.heading && c.heading.length > 0) return c.heading;
  if (c.numInt !== null) return `Clause ${c.numInt}`;
  return "Preamble";
}

// Collapse internal blank-line runs while preserving sub-clause line breaks.
function joinLines(lines: string[]): string {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n");
}

// The top-level clause numbers in document order — used by the validator to
// check uniqueness/monotonicity without re-parsing clause text elsewhere.
export function topLevelNumbers(doc: StructuredDocument): Array<number | null> {
  const out: Array<number | null> = [];
  for (const section of doc.sections) {
    for (const clause of section.clauses) {
      const m = /^\s*(\d{1,3})[.)\s]/.exec(clause.text);
      out.push(m ? Number.parseInt(m[1], 10) : null);
    }
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function looksLikeDateOrAmount(line: string): boolean {
  // Avoid matching "1.5 lakh", "1,000.00", or "10.05.2024" as a numbered clause.
  return /^\s*\d+[.,]\d+\s*(?:lakh|crore|usd|inr|rs\.?|%)/i.test(line);
}

// Heuristic for "is the candidate number followed by a heading (not body)".
// Used only to gate window-jump acceptance — pure next-in-sequence numbers are
// accepted regardless.
function isHeadingLike(rest: string): boolean {
  const trimmed = rest.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  if (/[,]$/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > 10) return false;
  return /^[A-Z0-9]/.test(trimmed);
}

// Extract a short caption from a clause's first line, or null when the line is
// clearly body text. Strips a trailing colon/semicolon/period.
function extractHeading(rest: string): string | null {
  const h = rest
    .trim()
    .replace(/[\s;:.]+$/g, "")
    .trim();
  if (h.length === 0 || h.length > 70) return null;
  const words = h.split(/\s+/);
  if (words.length > 9) return null;
  if (!/^[A-Za-z0-9]/.test(h)) return null;
  return h;
}
