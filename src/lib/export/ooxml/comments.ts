import PizZip from "pizzip";
import {
  type XmlDocument,
  type XmlElement,
  elementsByTag,
  firstChild,
  parseXml,
  serializeXml,
} from "./dom";
import type { CommentBlock, CommentRun } from "../shared/clause-comment";
import { COMMENT_AUTHOR_INITIALS } from "../shared/disclaimer";
import type { RevisionMeta } from "./types";

// Native Word comment injection for the tracked-changes path. A .docx upload is
// preserved byte-for-byte except for the redline edits; this adds the "why"
// alongside them as real Word comments (the Reviewing pane), so counsel who
// never leave Word still get the risk level, playbook-deviation flag, reasoning,
// and honest citation statuses — not just bare redlines.
//
// A valid comments feature needs four things wired together:
//   1. word/comments.xml                          — the comment bodies
//   2. [Content_Types].xml override               — declares the part's type
//   3. word/_rels/document.xml.rels relationship  — links document → comments
//   4. document.xml commentRangeStart/End + ref    — anchors each comment
// This module owns 1–3 and the anchoring helper for 4.

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const CONTENT_TYPES_PART = "[Content_Types].xml";
const RELS_PART = "word/_rels/document.xml.rels";
const COMMENTS_PART = "word/comments.xml";
const COMMENTS_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml";
const COMMENTS_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";

interface PendingComment {
  id: number;
  blocks: CommentBlock[];
}

export interface CommentCollector {
  add(blocks: CommentBlock[]): number;
  readonly size: number;
  readonly comments: readonly PendingComment[];
}

// A fresh collector whose ids start after any comment ids already in the package
// (uploaded docs almost never carry comments, but be safe and never collide).
export function createCommentCollector(zip: PizZip): CommentCollector {
  let nextId = nextCommentId(zip);
  const comments: PendingComment[] = [];
  return {
    add(blocks) {
      const id = nextId++;
      comments.push({ id, blocks });
      return id;
    },
    get size() {
      return comments.length;
    },
    comments,
  };
}

function nextCommentId(zip: PizZip): number {
  const file = zip.file(COMMENTS_PART);
  if (!file) return 0;
  const doc = parseXml(file.asText());
  let max = -1;
  for (const el of elementsByTag(doc, "w:comment")) {
    const id = Number.parseInt(el.getAttribute("w:id") ?? "", 10);
    if (Number.isFinite(id) && id > max) max = id;
  }
  return max + 1;
}

// Anchor a comment to a paragraph: a range spanning the whole paragraph plus the
// reference run Word uses to draw the comment balloon. commentRangeStart goes
// after w:pPr (if any) so it stays inside the paragraph; the end + reference run
// are appended after the (already redlined) content.
export function anchorComment(
  doc: XmlDocument,
  p: XmlElement,
  id: number,
): void {
  const idStr = String(id);

  const start = doc.createElement("w:commentRangeStart");
  start.setAttribute("w:id", idStr);
  const pPr = firstChild(p, "w:pPr");
  const refNode = pPr ? pPr.nextSibling : p.firstChild;
  p.insertBefore(start, refNode);

  const end = doc.createElement("w:commentRangeEnd");
  end.setAttribute("w:id", idStr);
  p.appendChild(end);

  const refRun = doc.createElement("w:r");
  const rPr = doc.createElement("w:rPr");
  const rStyle = doc.createElement("w:rStyle");
  rStyle.setAttribute("w:val", "CommentReference");
  rPr.appendChild(rStyle);
  refRun.appendChild(rPr);
  const ref = doc.createElement("w:commentReference");
  ref.setAttribute("w:id", idStr);
  refRun.appendChild(ref);
  p.appendChild(refRun);
}

function makeRun(
  doc: XmlDocument,
  run: CommentRun,
): XmlElement {
  const r = doc.createElement("w:r");
  if (run.bold) {
    const rPr = doc.createElement("w:rPr");
    rPr.appendChild(doc.createElement("w:b"));
    r.appendChild(rPr);
  }
  const t = doc.createElement("w:t");
  t.setAttribute("xml:space", "preserve");
  t.textContent = run.text;
  r.appendChild(t);
  return r;
}

function makeCommentParagraph(
  doc: XmlDocument,
  runs: CommentRun[],
  withAnnotationRef: boolean,
): XmlElement {
  const p = doc.createElement("w:p");
  const pPr = doc.createElement("w:pPr");
  const pStyle = doc.createElement("w:pStyle");
  pStyle.setAttribute("w:val", "CommentText");
  pPr.appendChild(pStyle);
  p.appendChild(pPr);

  // Word puts an annotation-reference glyph at the start of a comment's first
  // paragraph.
  if (withAnnotationRef) {
    const r = doc.createElement("w:r");
    const rPr = doc.createElement("w:rPr");
    const rStyle = doc.createElement("w:rStyle");
    rStyle.setAttribute("w:val", "CommentReference");
    rPr.appendChild(rStyle);
    r.appendChild(rPr);
    r.appendChild(doc.createElement("w:annotationRef"));
    p.appendChild(r);
  }

  for (const run of runs) p.appendChild(makeRun(doc, run));
  return p;
}

function buildCommentsDoc(existing: string | null): XmlDocument {
  if (existing) return parseXml(existing);
  return parseXml(`<w:comments xmlns:w="${W_NS}"></w:comments>`);
}

function ensureContentType(zip: PizZip): void {
  const file = zip.file(CONTENT_TYPES_PART);
  if (!file) return;
  const xml = file.asText();
  if (xml.includes(COMMENTS_CONTENT_TYPE)) return;
  const override = `<Override PartName="/word/comments.xml" ContentType="${COMMENTS_CONTENT_TYPE}"/>`;
  zip.file(CONTENT_TYPES_PART, xml.replace("</Types>", `${override}</Types>`));
}

function ensureRelationship(zip: PizZip): void {
  const file = zip.file(RELS_PART);
  if (!file) return;
  const xml = file.asText();
  if (xml.includes(COMMENTS_REL_TYPE)) return; // already linked
  const used = [...xml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  const next = (used.length > 0 ? Math.max(...used) : 0) + 1;
  const rel = `<Relationship Id="rId${next}" Type="${COMMENTS_REL_TYPE}" Target="comments.xml"/>`;
  zip.file(RELS_PART, xml.replace("</Relationships>", `${rel}</Relationships>`));
}

// Serialize all buffered comments into word/comments.xml and wire up the part
// (content type + relationship). No-op when nothing was collected, so a redline
// with no commentable clauses produces a package identical to before.
export function writeComments(
  zip: PizZip,
  collector: CommentCollector,
  rev: RevisionMeta,
): void {
  if (collector.size === 0) return;

  const existing = zip.file(COMMENTS_PART)?.asText() ?? null;
  const doc = buildCommentsDoc(existing);
  const root = doc.documentElement;

  for (const pending of collector.comments) {
    const comment = doc.createElement("w:comment");
    comment.setAttribute("w:id", String(pending.id));
    comment.setAttribute("w:author", rev.author);
    comment.setAttribute("w:date", rev.dateIso);
    comment.setAttribute("w:initials", COMMENT_AUTHOR_INITIALS);
    pending.blocks.forEach((runs, i) => {
      comment.appendChild(makeCommentParagraph(doc, runs, i === 0));
    });
    root.appendChild(comment);
  }

  const body = serializeXml(doc).replace(/^<\?xml[^>]*\?>\s*/, "");
  zip.file(
    COMMENTS_PART,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`,
  );
  ensureContentType(zip);
  ensureRelationship(zip);
}
