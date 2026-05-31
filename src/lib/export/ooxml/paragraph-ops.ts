import {
  type XmlDocument,
  type XmlElement,
  type IdAllocator,
  ELEMENT_NODE,
  directChildren,
  firstChild,
  setWordText,
} from "./dom";
import { normalizeWithMap } from "./normalize-map";
import type { RedlineMode, RevisionMeta } from "./types";

// A single character of a paragraph's flattened text, mapped back to the exact
// run + offset it came from (so we can split runs precisely at a span boundary).
interface CharAtom {
  ch: string;
  runIndex: number;
  textEl: XmlElement | null; // null for w:tab / w:br pseudo-chars
  offsetInText: number;
}

export interface ParaModel {
  runs: XmlElement[];
  chars: CharAtom[];
  rawText: string;
}

// Concatenate a paragraph's text the same way the projection does, without the
// full per-char model — used to pre-scan every paragraph cheaply.
export function paragraphRawText(p: XmlElement): string {
  let out = "";
  for (const run of directChildren(p, "w:r")) {
    const kids = run.childNodes;
    for (let i = 0; i < kids.length; i += 1) {
      const n = kids[i];
      if (n.nodeType !== ELEMENT_NODE) continue;
      if (n.nodeName === "w:t") out += n.textContent ?? "";
      else if (n.nodeName === "w:tab") out += "\t";
      else if (n.nodeName === "w:br" || n.nodeName === "w:cr") out += "\n";
    }
  }
  return out;
}

export function buildParaModel(p: XmlElement): ParaModel {
  const runs = directChildren(p, "w:r");
  const chars: CharAtom[] = [];
  for (let r = 0; r < runs.length; r += 1) {
    const kids = runs[r].childNodes;
    for (let i = 0; i < kids.length; i += 1) {
      const n = kids[i];
      if (n.nodeType !== ELEMENT_NODE) continue;
      if (n.nodeName === "w:t") {
        const text = n.textContent ?? "";
        for (let j = 0; j < text.length; j += 1) {
          chars.push({ ch: text[j], runIndex: r, textEl: n as XmlElement, offsetInText: j });
        }
      } else if (n.nodeName === "w:tab") {
        chars.push({ ch: "\t", runIndex: r, textEl: null, offsetInText: 0 });
      } else if (n.nodeName === "w:br" || n.nodeName === "w:cr") {
        chars.push({ ch: "\n", runIndex: r, textEl: null, offsetInText: 0 });
      }
    }
  }
  return { runs, chars, rawText: chars.map((c) => c.ch).join("") };
}

export interface SpanLocation {
  rawStart: number; // inclusive index into model.chars
  rawEnd: number; // inclusive
}

// Find the clause span within a paragraph. Prefer an exact match of the full
// normalized clause text (handles sub-paragraph clauses); fall back to "the
// whole paragraph is essentially this clause" when lengths are close.
export function locateSpan(
  model: ParaModel,
  normClause: string,
  normAnchor: string,
): SpanLocation | null {
  if (model.chars.length === 0) return null;
  const { norm, normToRaw } = normalizeWithMap(model.rawText);
  if (norm.length === 0) return null;

  let ns = -1;
  let ne = -1;
  if (normClause.length > 0) {
    const idx = norm.indexOf(normClause);
    if (idx >= 0) {
      ns = idx;
      ne = idx + normClause.length;
    }
  }

  if (ns < 0) {
    // No exact clause match. Accept whole-paragraph replacement only when the
    // anchor is present AND the paragraph is essentially just this clause.
    const tolerance = Math.max(12, Math.floor(normClause.length * 0.12));
    if (
      normAnchor.length > 0 &&
      norm.startsWith(normAnchor) &&
      Math.abs(norm.length - normClause.length) <= tolerance
    ) {
      ns = 0;
      ne = norm.length;
    } else {
      return null;
    }
  }

  const rawStart = normToRaw[ns];
  const rawEnd = normToRaw[ne - 1];
  if (rawStart == null || rawEnd == null || rawEnd < rawStart) return null;
  return { rawStart, rawEnd };
}

// Split a text run at `offset`, returning the new RIGHT-hand run (a clone that
// inherits rPr). The original keeps [0, offset); the clone gets [offset, end).
function splitTextRun(run: XmlElement, textEl: XmlElement, offset: number): XmlElement {
  const full = textEl.textContent ?? "";
  const clone = run.cloneNode(true) as XmlElement;
  setWordText(textEl, full.slice(0, offset));
  const cloneT = firstChild(clone, "w:t");
  if (cloneT) setWordText(cloneT, full.slice(offset));
  const parent = run.parentNode;
  if (parent) parent.insertBefore(clone, run.nextSibling);
  return clone;
}

function cloneRpr(doc: XmlDocument, templateRun: XmlElement | null): XmlElement | null {
  if (!templateRun) return null;
  const rpr = firstChild(templateRun, "w:rPr");
  return rpr ? (rpr.cloneNode(true) as XmlElement) : null;
}

function buildRun(doc: XmlDocument, text: string, rpr: XmlElement | null): XmlElement {
  const r = doc.createElement("w:r");
  if (rpr) r.appendChild(rpr.cloneNode(true));
  const t = doc.createElement("w:t");
  setWordText(t, text);
  r.appendChild(t);
  return r;
}

const COMPLEX_RUN_TAGS = [
  "w:drawing",
  "w:object",
  "w:pict",
  "w:fldChar",
  "w:footnoteReference",
  "w:endnoteReference",
];

function runHasComplexContent(run: XmlElement | undefined): boolean {
  if (!run) return false;
  for (const tag of COMPLEX_RUN_TAGS) {
    if (run.getElementsByTagName(tag).length > 0) return true;
  }
  return false;
}

function convertRunToDeleted(doc: XmlDocument, run: XmlElement): void {
  for (const t of directChildren(run, "w:t")) {
    const del = doc.createElement("w:delText");
    const txt = t.textContent ?? "";
    del.textContent = txt;
    if (txt !== txt.trim() || txt.length === 0) {
      del.setAttribute("xml:space", "preserve");
    }
    run.replaceChild(del, t);
  }
}

// Replace the contiguous deletion runs with the change. In "redlined" mode the
// old runs are wrapped in <w:del> (text → delText) and a sibling <w:ins> carries
// the new text; in "clean" mode the old runs are removed and a plain run with the
// final text takes their place. rPr from the first deletion run is inherited so
// the new text matches the original formatting.
function applyReplacement(
  doc: XmlDocument,
  parent: XmlElement,
  deletion: XmlElement[],
  newText: string,
  mode: RedlineMode,
  rev: RevisionMeta,
  ids: IdAllocator,
): void {
  if (deletion.length === 0) return;
  const rpr = cloneRpr(doc, deletion[0]);
  const anchorNode = deletion[0];

  if (mode === "clean") {
    parent.insertBefore(buildRun(doc, newText, rpr), anchorNode);
    for (const r of deletion) parent.removeChild(r);
    return;
  }

  const del = doc.createElement("w:del");
  del.setAttribute("w:id", String(ids.next()));
  del.setAttribute("w:author", rev.author);
  del.setAttribute("w:date", rev.dateIso);
  parent.insertBefore(del, anchorNode);
  for (const r of deletion) {
    parent.removeChild(r);
    convertRunToDeleted(doc, r);
    del.appendChild(r);
  }

  if (newText.length > 0) {
    const ins = doc.createElement("w:ins");
    ins.setAttribute("w:id", String(ids.next()));
    ins.setAttribute("w:author", rev.author);
    ins.setAttribute("w:date", rev.dateIso);
    ins.appendChild(buildRun(doc, newText, rpr));
    parent.insertBefore(ins, del.nextSibling);
  }
}

// Apply a span replacement to a paragraph. Splits boundary runs so exactly the
// matched span is isolated, then deletes/inserts. Returns false (→ caller falls
// back) for the rare shapes we won't risk mutating.
export function applyParagraphReplacement(
  doc: XmlDocument,
  p: XmlElement,
  model: ParaModel,
  span: SpanLocation,
  newText: string,
  mode: RedlineMode,
  rev: RevisionMeta,
  ids: IdAllocator,
): boolean {
  const startChar = model.chars[span.rawStart];
  const endChar = model.chars[span.rawEnd];
  if (!startChar || !endChar) return false;

  // Bail (→ caller appends a proposal instead) if any run in the span carries
  // complex inline content we should not risk splitting/deleting — drawings,
  // fields, footnote/endnote refs, embedded objects. Tabs and breaks are safe
  // inside <w:del>, so they are NOT treated as complex.
  for (let ri = startChar.runIndex; ri <= endChar.runIndex; ri += 1) {
    if (runHasComplexContent(model.runs[ri])) return false;
  }

  const parent = p;

  // Same text run on both ends → up-to-3-way split.
  if (
    startChar.runIndex === endChar.runIndex &&
    startChar.textEl &&
    startChar.textEl === endChar.textEl
  ) {
    const run = model.runs[startChar.runIndex];
    const textEl = startChar.textEl;
    const full = textEl.textContent ?? "";
    const s = startChar.offsetInText;
    const e = endChar.offsetInText + 1; // exclusive
    if (s < 0 || e > full.length || e <= s) return false;

    const rprTemplate = run;
    const midRun = run.cloneNode(true) as XmlElement;
    const rightRun = run.cloneNode(true) as XmlElement;
    setWordText(textEl, full.slice(0, s));
    const midT = firstChild(midRun, "w:t");
    const rightT = firstChild(rightRun, "w:t");
    if (!midT || !rightT) return false;
    setWordText(midT, full.slice(s, e));
    setWordText(rightT, full.slice(e));

    parent.insertBefore(midRun, run.nextSibling);
    parent.insertBefore(rightRun, midRun.nextSibling);
    if (full.slice(e).length === 0) parent.removeChild(rightRun);
    if (s === 0) parent.removeChild(run);
    void rprTemplate;
    applyReplacement(doc, parent, [midRun], newText, mode, rev, ids);
    return true;
  }

  if (startChar.runIndex === endChar.runIndex) {
    // Same run but different text nodes — unusual; don't risk it.
    return false;
  }

  let startRun = model.runs[startChar.runIndex];
  const endRun = model.runs[endChar.runIndex];

  // Isolate the start boundary: keep [0, offset) in the original, delete from
  // the clone onward.
  if (startChar.textEl && startChar.offsetInText > 0) {
    startRun = splitTextRun(startRun, startChar.textEl, startChar.offsetInText);
  }
  // Isolate the end boundary: the original keeps [0, offset], the clone keeps
  // the remainder.
  if (endChar.textEl) {
    const full = endChar.textEl.textContent ?? "";
    if (endChar.offsetInText < full.length - 1) {
      splitTextRun(endRun, endChar.textEl, endChar.offsetInText + 1);
    }
  }

  // Collect the contiguous run set from startRun..endRun (inclusive).
  const deletion: XmlElement[] = [];
  let cur = startRun as XmlElement | null;
  let reachedEnd = false;
  while (cur) {
    if (cur.nodeType === ELEMENT_NODE && cur.nodeName === "w:r") {
      deletion.push(cur);
    }
    if (cur === endRun) {
      reachedEnd = true;
      break;
    }
    cur = cur.nextSibling as XmlElement | null;
  }
  if (!reachedEnd || deletion.length === 0) return false;

  applyReplacement(doc, parent, deletion, newText, mode, rev, ids);
  return true;
}
