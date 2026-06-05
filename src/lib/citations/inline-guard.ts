import "server-only";
import { canonicalize, extractSectionNumber } from "./normalize";
import type { ExtractedCitation } from "./schemas";

// Inline citation hallucination guard. The bracketed-[CITE:]-only verifier leaves
// a hole: a statute or case named in PROSE (e.g. "…under the DPDP Act 2023…",
// "Section 73 of the Indian Contract Act", "Puttaswamy v. Union of India") is
// never checked, so an ungrounded statutory claim can reach the user. This module
// detects those un-bracketed references, lets the SAME verify→gate pipeline check
// them, and then either NEUTRALISES the ones that don't verify (default) or leaves
// them with a warning chip (INLINE_GUARD_MODE=chip). This is the literal
// enforcement of the CLAUDE.md "every citation verified before display" mandate.

export type InlineGuardMode = "neutralize" | "chip";

export function inlineGuardEnabled(): boolean {
  // Default ON. Set INLINE_GUARD_ENABLED=0 to disable.
  return process.env.INLINE_GUARD_ENABLED !== "0";
}

export function inlineGuardMode(): InlineGuardMode {
  return process.env.INLINE_GUARD_MODE === "chip" ? "chip" : "neutralize";
}

export interface InlineRef {
  kind: "statute" | "case";
  start: number;
  end: number;
  surface: string; // exact matched span (what neutralize replaces)
  name: string; // statute or case name
  section: string; // "" for cases / section-less statutes
  year: number | null;
  canonicalKey: string; // identity used to match across fields
}

const YEAR = "(1[789]\\d{2}|20\\d{2})";
// An act NAME: a bounded run (<=7 tokens) of Title-Case words and lowercase
// connectors (and/of/&), ending in the literal "Act". Capitalization-aware so it
// never lazily spans across ordinary lowercase prose words (e.g. it won't capture
// "This breaches the Foobar Act" as one name). A leading "the" is matched by the
// surrounding patterns, not captured into the name (so the canonical name matches
// the corpus, which has no leading "the").
const ACT_NAME = "((?:(?:[A-Z][A-Za-z.'&\\-]*|and|of|&),?\\s+){0,7}Act)";
// Case-handled explicitly (NOT the /i flag, which would let ACT_NAME's [A-Z]
// match lowercase and lose its capitalization-awareness).
const SECTION_KW = "(?:[Ss]ection|[Ss]ec\\.?|[Ss]\\.)";
const THE = "(?:[Tt]he\\s+)?";
// "Section 73 of the Indian Contract Act, 1872" (section + named act).
const STATUTE_WITH_SECTION = new RegExp(
  `\\b${SECTION_KW}\\s*([0-9]+[A-Za-z]?(?:\\([0-9A-Za-z]+\\))?)\\s+[Oo]f\\s+${THE}${ACT_NAME}(?:,?\\s+${YEAR})?`,
  "g",
);
// "the Indian Contract Act, 1872" (named act WITH a year, no section). Requiring a
// year keeps false positives down (a bare "X Act" mention is not a specific claim).
const STATUTE_WITH_YEAR = new RegExp(`\\b${THE}${ACT_NAME},?\\s+${YEAR}\\b`, "g");
// NOTE: this guard intentionally covers STATUTES only. Case names in prose carry
// lowercase connectors ("of", "and") that truncate naive capitalised-word
// matching and risk mangling a real citation; bracketed case [CITE:] tokens are
// already handled by the extract→verify→gate path.

// Spans already inside a [CITE: …] token — prose detection skips these so we
// never double-handle an already-bracketed citation.
function bracketedSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const re = /\[CITE:[^\]]*\]/gi;
  for (const m of text.matchAll(re)) {
    if (m.index !== undefined) spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function overlaps(start: number, end: number, spans: Array<[number, number]>): boolean {
  return spans.some(([s, e]) => start < e && end > s);
}

function parseYear(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1800 && n <= 3000 ? n : null;
}

function statuteKey(name: string, section: string): string {
  // Strip a trailing year from the canonical name so "Indian Contract Act 1872"
  // and "Indian Contract Act" share an identity; pair it with the section.
  const canon = canonicalize(name).replace(/[\s,]+(1[789]\d{2}|20\d{2})\s*$/, "").trim();
  return `statute|${canon}|${extractSectionNumber(section) ?? ""}`;
}

// Detect un-bracketed statutory references in `text`.
export function scanInlineRefs(text: string): InlineRef[] {
  if (!text) return [];
  const skip = bracketedSpans(text);
  const out: InlineRef[] = [];
  const seenSpan = new Set<string>();

  const push = (ref: InlineRef) => {
    if (overlaps(ref.start, ref.end, skip)) return;
    const k = `${ref.start}:${ref.end}`;
    if (seenSpan.has(k)) return;
    seenSpan.add(k);
    out.push(ref);
  };

  for (const m of text.matchAll(STATUTE_WITH_SECTION)) {
    const start = m.index ?? 0;
    push({
      kind: "statute",
      start,
      end: start + m[0].length,
      surface: m[0],
      name: m[2].trim(),
      section: m[1].trim(),
      year: parseYear(m[3]),
      canonicalKey: statuteKey(m[2], m[1]),
    });
  }
  for (const m of text.matchAll(STATUTE_WITH_YEAR)) {
    const start = m.index ?? 0;
    push({
      kind: "statute",
      start,
      end: start + m[0].length,
      surface: m[0],
      name: m[1].trim(),
      section: "",
      year: parseYear(m[2]),
      canonicalKey: statuteKey(m[1], ""),
    });
  }

  // Earliest-first; de-dupe overlapping statute matches (section form wins).
  out.sort((a, b) => a.start - b.start);
  return dedupeOverlaps(out);
}

function dedupeOverlaps(refs: InlineRef[]): InlineRef[] {
  const kept: InlineRef[] = [];
  for (const r of refs) {
    if (kept.some((k) => r.start < k.end && r.end > k.start)) continue;
    kept.push(r);
  }
  return kept;
}

// Build an ExtractedCitation-shaped token so an inline ref can flow through the
// EXACT same verifyOne + gate path as a bracketed citation. Uses a stable
// synthetic id derived from the canonical key.
export function toCitationToken(ref: InlineRef): ExtractedCitation {
  const id = `inline-${hash(ref.canonicalKey)}`;
  return {
    id,
    raw: ref.surface,
    caseOrStatute: ref.name,
    sectionOrCitation: ref.section,
    year: ref.year,
    // A statute is checkable by (name + section). A name+year-only prose mention
    // (no section) is still verifiable by the act-level corpus lookup, so allow it.
    formatValid: ref.name.length > 0 && (ref.section.length > 0 || ref.year !== null),
  };
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

// Replace each unverified inline ref in `text` with neutral language: a statute
// becomes "applicable Indian law" (section dropped); a case is dropped to its
// surrounding wording removed. Idempotent and field-agnostic — re-scans `text`
// itself, so it can be applied to explanation / issue / suggestion independently.
export function neutralizeText(text: string, unverifiedKeys: ReadonlySet<string>): string {
  if (!text || unverifiedKeys.size === 0) return text;
  const refs = scanInlineRefs(text).filter((r) => unverifiedKeys.has(r.canonicalKey));
  if (refs.length === 0) return text;
  // Replace from the end so earlier indices stay valid.
  let out = text;
  for (const r of [...refs].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, r.start) + "applicable Indian law" + out.slice(r.end);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}
