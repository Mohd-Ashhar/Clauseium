import { randomUUID } from "node:crypto";
import type { Section, StructuredDocument } from "@/types/ingestion";

const SECTION_HEADER_REGEX =
  /^\s*(?:(SECTION|ARTICLE|PART|SCHEDULE|ANNEXURE|EXHIBIT)\s+)([IVXLCDM]+|\d+)(?:\s*[-–:.]\s*(.+))?$/i;
const ALLCAPS_HEADER_REGEX = /^\s*([A-Z][A-Z0-9 &,'\-/]{4,79})\s*$/;
const NUMBERED_CLAUSE_REGEX = /^\s*(\d+(?:\.\d+)*)\s*[.)]?\s+(\S.*)$/;
const LETTERED_CLAUSE_REGEX = /^\s*\(([a-z]{1,3}|[ivx]{1,5})\)\s+(\S.*)$/i;
const PREAMBLE_REGEX = /^\s*(WHEREAS|NOW,?\s*THEREFORE|IN\s+WITNESS\s+WHEREOF|RECITALS?)\b/i;
const SIGNATURE_BLOCK_REGEX =
  /^\s*(SIGNED|EXECUTED\s+(AS|BY)|For\s+and\s+on\s+behalf\s+of|Authorised\s+Signator(y|ies)|_{5,}|Name\s*:\s*$|Designation\s*:\s*$|Date\s*:\s*$)/i;
// Schedules, annexures, exhibits and appendices routinely sit AFTER the
// signature block yet carry the most negotiated commercial terms (pricing,
// SLAs, SOWs, data-processing terms). We use this to RESUME parsing once a
// signature block has been seen, instead of discarding the rest of the file.
const SCHEDULE_RESUME_REGEX =
  /^\s*(SCHEDULE|ANNEXURE|ANNEX|EXHIBIT|APPENDIX|ADDENDUM)\b/i;

const MIN_CLAUSE_LENGTH = 20;

interface PendingClause {
  number: string | null;
  text: string;
}

interface PendingSection {
  title: string;
  clauses: PendingClause[];
}

export function detectStructure(text: string): StructuredDocument {
  const lines = text.split("\n");
  const sections: PendingSection[] = [];
  let current: PendingSection | null = null;
  let buffer: PendingClause | null = null;
  let prevBlank = true;
  let inSignatureZone = false;

  const ensureSection = (title: string): PendingSection => {
    const sec: PendingSection = { title, clauses: [] };
    sections.push(sec);
    current = sec;
    return sec;
  };

  const flushBuffer = () => {
    if (buffer && buffer.text.trim().length > 0) {
      const target: PendingSection = current ?? ensureSection("Preamble");
      target.clauses.push({ number: buffer.number, text: buffer.text.trim() });
    }
    buffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Once inside a signature block, skip the boilerplate (party names,
    // dates, signature lines) BUT keep scanning: resume the moment a
    // schedule/annexure/exhibit or a new top-level section begins, so
    // post-signature commercial terms are no longer silently dropped (the
    // old behaviour was a hard `break` that discarded the entire tail).
    if (inSignatureZone) {
      if (SCHEDULE_RESUME_REGEX.test(line) || SECTION_HEADER_REGEX.test(line)) {
        inSignatureZone = false;
        prevBlank = true;
        // fall through to normal handling for this header line
      } else {
        continue;
      }
    }

    if (SIGNATURE_BLOCK_REGEX.test(line)) {
      flushBuffer();
      inSignatureZone = true;
      continue;
    }

    if (line.trim().length === 0) {
      if (buffer) buffer.text += "\n";
      prevBlank = true;
      continue;
    }

    const sectionMatch = SECTION_HEADER_REGEX.exec(line);
    if (sectionMatch) {
      flushBuffer();
      const kind = sectionMatch[1];
      const num = sectionMatch[2];
      const heading = sectionMatch[3]?.trim();
      const title = heading ? `${capitalize(kind)} ${num} — ${heading}` : `${capitalize(kind)} ${num}`;
      ensureSection(title);
      prevBlank = false;
      continue;
    }

    if (PREAMBLE_REGEX.test(line)) {
      flushBuffer();
      const c = current as PendingSection | null;
      if (!c || c.title !== "Preamble") ensureSection("Preamble");
      buffer = { number: null, text: line.trim() };
      prevBlank = false;
      continue;
    }

    const numberedMatch = NUMBERED_CLAUSE_REGEX.exec(line);
    if (numberedMatch && !looksLikeDateOrAmount(line)) {
      flushBuffer();
      const number = numberedMatch[1];
      const rest = numberedMatch[2];
      const c = current as PendingSection | null;
      if (/^\d+$/.test(number) && isLikelyHeading(rest) && (!c || c.clauses.length > 0)) {
        ensureSection(`${number}. ${rest.trim()}`);
        buffer = null;
      } else {
        if (!c) ensureSection("Body");
        buffer = { number, text: rest };
      }
      prevBlank = false;
      continue;
    }

    const letteredMatch = LETTERED_CLAUSE_REGEX.exec(line);
    if (letteredMatch) {
      flushBuffer();
      if (!(current as PendingSection | null)) ensureSection("Body");
      buffer = { number: `(${letteredMatch[1]})`, text: letteredMatch[2] };
      prevBlank = false;
      continue;
    }

    const allcapsMatch = ALLCAPS_HEADER_REGEX.exec(line);
    if (allcapsMatch && prevBlank && !NUMBERED_CLAUSE_REGEX.test(line)) {
      flushBuffer();
      ensureSection(titleCase(allcapsMatch[1].trim()));
      prevBlank = false;
      continue;
    }

    if (!buffer) {
      if (!(current as PendingSection | null)) ensureSection("Body");
      buffer = { number: null, text: line.trim() };
    } else {
      buffer.text += " " + line.trim();
    }
    prevBlank = false;
  }

  flushBuffer();

  // Drop tiny clauses that are likely artifacts.
  let position = 0;
  const cleaned: Section[] = [];
  for (const sec of sections) {
    const kept = sec.clauses
      .filter((c) => c.text.length >= MIN_CLAUSE_LENGTH)
      .map((c) => ({
        // Always emit a real UUID — the clauses.id column is uuid-typed and
        // persistContract uses this id directly. The earlier "slug-num-uuid"
        // debug form broke INSERTs ("invalid input syntax for type uuid").
        id: randomUUID(),
        text: c.number ? `${c.number} ${c.text}` : c.text,
        position: position++,
      }));
    if (kept.length > 0) {
      cleaned.push({ title: sec.title, clauses: kept });
    }
  }

  if (cleaned.length === 0) {
    // Fallback path: the regex-based detector found no section/clause
    // boundaries. This happens on heavily-formatted templates (BPO forms
    // with text inside tables/textboxes) and on documents where upstream
    // parsing lost paragraph breaks. Emitting a single 4000-char mega-clause
    // (the previous behavior) hides the whole document from the analyzer
    // because such a blob always gets filtered as non-substantive — and
    // the user sees "1 clauses · 0 high risk" on a 60-page contract.
    //
    // Instead, split on blank-line paragraph breaks (or, failing that, on
    // newlines) and emit each paragraph as its own clause. The analyzer's
    // substantive-check still drops genuine non-clauses (short fragments,
    // page markers); real provisions get a chance to be analyzed.
    console.warn(
      `[ingestion] structure detector found 0 sections in ${text.length} chars — falling back to paragraph chunks`,
    );
    const candidates =
      text.split(/\n\s*\n/).length > 1
        ? text.split(/\n\s*\n/)
        : text.split(/\n/);
    const paragraphs = candidates
      .map((p) => p.replace(/[ \t]+/g, " ").trim())
      .filter((p) => p.length >= MIN_CLAUSE_LENGTH);

    if (paragraphs.length === 0) {
      cleaned.push({
        title: "Body",
        clauses: [{ id: randomUUID(), text: text.trim().slice(0, 4000), position: 0 }],
      });
    } else {
      cleaned.push({
        title: "Body",
        clauses: paragraphs.map((p, i) => ({
          id: randomUUID(),
          text: p,
          position: i,
        })),
      });
    }
  }

  return { sections: cleaned };
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

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function looksLikeDateOrAmount(line: string): boolean {
  // Avoid matching "1.5 lakh", "1,000.00", or "10.05.2024" as a numbered clause.
  return /^\s*\d+[.,]\d+\s*(?:lakh|crore|usd|inr|rs\.?|%)/i.test(line);
}

function isLikelyHeading(rest: string): boolean {
  const trimmed = rest.trim();
  if (trimmed.length > 80) return false;
  if (/[.;:!?]$/.test(trimmed)) return false;
  // Title-Case or ALL CAPS heuristic.
  const words = trimmed.split(/\s+/);
  if (words.length > 8) return false;
  const upperish = words.filter((w) => /^[A-Z]/.test(w)).length;
  return upperish / words.length >= 0.6;
}
