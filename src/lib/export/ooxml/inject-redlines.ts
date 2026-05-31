import PizZip from "pizzip";
import { normalizeForAnchor } from "@/lib/ingestion/search-anchor";
import {
  type XmlDocument,
  type XmlElement,
  type IdAllocator,
  parseXml,
  serializeXml,
  elementsByTag,
  directChildren,
  createIdAllocator,
  maxRevisionId,
} from "./dom";
import {
  buildParaModel,
  locateSpan,
  paragraphRawText,
  applyParagraphReplacement,
} from "./paragraph-ops";
import type {
  ClauseManifestEntry,
  EngineClause,
  InjectRedlinesArgs,
  RedlineEngineResult,
  RedlineMode,
  RevisionMeta,
} from "./types";

const DOCUMENT_PART = "word/document.xml";

// Inject tracked-change redlines into the ORIGINAL .docx, preserving every other
// part of the package byte-for-byte. Conservative: a clause that cannot be
// confidently located is never force-edited — it is appended as a clearly
// delimited proposal block (redlined: a tracked insertion; clean: plain) and
// reported as a fallback so nothing is silently dropped.
export function injectRedlines(args: InjectRedlinesArgs): RedlineEngineResult {
  const zip = new PizZip(args.originalDocx);
  const docFile = zip.file(DOCUMENT_PART);
  if (!docFile) {
    throw new Error(`${DOCUMENT_PART} not found — not a valid .docx`);
  }
  const doc = parseXml(docFile.asText());
  const body = elementsByTag(doc, "w:body")[0];
  if (!body) throw new Error("w:body not found in document.xml");

  const paragraphs = elementsByTag(doc, "w:p");
  const paraNorm = paragraphs.map(
    (p) => normalizeForAnchor(paragraphRawText(p)),
  );
  const ids = createIdAllocator(maxRevisionId(doc) + 1);
  const usedParas = new Set<XmlElement>();
  let lastPi = -1;

  const manifest: ClauseManifestEntry[] = [];
  let applied = 0;
  let fallback = 0;
  let skipped = 0;
  const fallbackClauses: EngineClause[] = [];
  const insertClauses: EngineClause[] = [];

  const sorted = [...args.clauses].sort((a, b) => a.position - b.position);

  for (let ci = 0; ci < sorted.length; ci += 1) {
    const clause = sorted[ci];

    if (clause.op === "skip") {
      skipped += 1;
      manifest.push(entry(clause, "skipped", "no change requested"));
      continue;
    }
    if (clause.op === "insert") {
      insertClauses.push(clause);
      continue;
    }

    const anchor =
      clause.searchAnchor && clause.searchAnchor.trim().length > 0
        ? clause.searchAnchor.trim()
        : normalizeForAnchor(clause.clauseText).slice(0, 150);
    const normClause = normalizeForAnchor(clause.clauseText);
    if (!anchor) {
      fallback += 1;
      fallbackClauses.push(clause);
      manifest.push(entry(clause, "fallback", "no anchor to locate clause"));
      continue;
    }

    const candidates: number[] = [];
    for (let pi = 0; pi < paragraphs.length; pi += 1) {
      if (usedParas.has(paragraphs[pi])) continue;
      if (paraNorm[pi].includes(anchor)) candidates.push(pi);
    }
    if (candidates.length === 0) {
      fallback += 1;
      fallbackClauses.push(clause);
      manifest.push(entry(clause, "fallback", "clause text not found in document"));
      continue;
    }

    // Disambiguate by document order: clauses are processed in position order,
    // so prefer the first matching (unused) paragraph at or after the last one
    // we redlined. candidates is ascending, so the first > lastPi is nearest.
    let bestPi = candidates.find((pi) => pi > lastPi);
    if (bestPi === undefined) bestPi = candidates[0];
    lastPi = bestPi;

    const p = paragraphs[bestPi];
    const model = buildParaModel(p);
    const span = locateSpan(model, normClause, anchor);
    if (!span) {
      fallback += 1;
      fallbackClauses.push(clause);
      manifest.push(entry(clause, "fallback", "could not bound clause span safely"));
      continue;
    }

    const ok = applyParagraphReplacement(
      doc,
      p,
      model,
      span,
      clause.newText,
      args.mode,
      args.rev,
      ids,
    );
    if (ok) {
      usedParas.add(p);
      applied += 1;
      manifest.push(entry(clause, "applied", "tracked change applied"));
    } else {
      fallback += 1;
      fallbackClauses.push(clause);
      manifest.push(entry(clause, "fallback", "unsafe run shape — appended instead"));
    }
  }

  // Append proposed additions (missing clauses) + any fallback proposals as a
  // clearly delimited block at the end of the body.
  const appendList = [...insertClauses, ...fallbackClauses];
  if (appendList.length > 0) {
    appendProposals(doc, body, appendList, args.mode, args.rev, ids);
    for (const c of insertClauses) {
      applied += 1;
      manifest.push(entry(c, "applied", "inserted as proposed addition"));
    }
  }

  zip.file(DOCUMENT_PART, serializeXml(doc));
  const bytes = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  return { bytes, applied, fallback, skipped, manifest };
}

function entry(
  clause: EngineClause,
  outcome: ClauseManifestEntry["outcome"],
  reason: string,
): ClauseManifestEntry {
  return { clauseId: clause.id, position: clause.position, outcome, reason };
}

function makeRun(doc: XmlDocument, text: string, bold: boolean): XmlElement {
  const r = doc.createElement("w:r");
  if (bold) {
    const rpr = doc.createElement("w:rPr");
    rpr.appendChild(doc.createElement("w:b"));
    r.appendChild(rpr);
  }
  const t = doc.createElement("w:t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = text;
  r.appendChild(t);
  return r;
}

function makeParagraph(doc: XmlDocument, child: XmlElement): XmlElement {
  const p = doc.createElement("w:p");
  p.appendChild(child);
  return p;
}

function appendProposals(
  doc: XmlDocument,
  body: XmlElement,
  clauses: EngineClause[],
  mode: RedlineMode,
  rev: RevisionMeta,
  ids: IdAllocator,
): void {
  const sectPr = lastDirectChild(body, "w:sectPr");
  const before = (node: XmlElement) => body.insertBefore(node, sectPr);

  before(
    makeParagraph(
      doc,
      makeRun(doc, "— Clauseium AI — proposed additions / clauses for manual review —", true),
    ),
  );

  for (const clause of clauses) {
    const label = clause.sectionTitle ? `${clause.sectionTitle}: ` : "";
    const text = `${label}${clause.newText}`;
    if (mode === "redlined") {
      const ins = doc.createElement("w:ins");
      ins.setAttribute("w:id", String(ids.next()));
      ins.setAttribute("w:author", rev.author);
      ins.setAttribute("w:date", rev.dateIso);
      ins.appendChild(makeRun(doc, text, false));
      before(makeParagraph(doc, ins));
    } else {
      before(makeParagraph(doc, makeRun(doc, text, false)));
    }
  }
}

function lastDirectChild(parent: XmlElement, tag: string): XmlElement | null {
  const matches = directChildren(parent, tag);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}
