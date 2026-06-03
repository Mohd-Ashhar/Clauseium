import { describe, it, expect, vi } from "vitest";
import PizZip from "pizzip";

vi.mock("server-only", () => ({}));

import { DOMParser } from "@xmldom/xmldom";
import { injectRedlines } from "./inject-redlines";
import type { EngineClause } from "./types";
import { composeClauseComment } from "../shared/clause-comment";

const CLAUSE_TEXT =
  "The lessee shall indemnify the lessor against all claims without limitation.";
const CLAUSE_TEXT_2 =
  "Either party may terminate this agreement immediately on written notice.";

// A minimal but valid .docx package with one paragraph per supplied clause text.
function makeDocx(texts: string[] = [CLAUSE_TEXT]): Buffer {
  const zip = new PizZip();
  const paras = texts
    .map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`)
    .join("\n");
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${paras}
<w:sectPr/>
</w:body>
</w:document>`,
  );
  return zip.generate({ type: "nodebuffer" });
}

function clauseWithComment(): EngineClause {
  return {
    id: "c1",
    position: 0,
    searchAnchor: null,
    clauseText: CLAUSE_TEXT,
    sectionTitle: "Indemnity",
    op: "replace",
    newText:
      "The lessee shall indemnify the lessor against direct claims, capped at fees paid.",
    comment: composeClauseComment({
      riskLevel: "high",
      summary: "Uncapped indemnity exposes the lessee without limit.",
      reasoning: "Indemnity has no cap and no carve-outs.",
      citations: [
        {
          id: "ica-73",
          text: "Indian Contract Act s.73",
          source: "Indian Contract Act",
          section: "73",
          status: "verified",
        },
      ],
      ruleIds: ["liability.uncapped"],
    }),
  };
}

// Collect the w:id values of a tag, parsing strictly so malformed XML throws.
function idsOf(xml: string, tag: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const out: string[] = [];
  const list = doc.getElementsByTagName(tag);
  for (let i = 0; i < list.length; i += 1) {
    const id = list.item(i)?.getAttribute("w:id");
    if (id) out.push(id);
  }
  return out;
}

const REV = { author: "Clauseium AI", dateIso: "2026-06-03T00:00:00.000Z" };

describe("injectRedlines — native Word comments (tracked path)", () => {
  it("redlines the clause AND wires up all four comment parts", () => {
    const result = injectRedlines({
      originalDocx: makeDocx(),
      clauses: [clauseWithComment()],
      mode: "redlined",
      rev: REV,
    });
    expect(result.applied).toBe(1);

    const out = new PizZip(result.bytes);
    const doc = out.file("word/document.xml")!.asText();
    const comments = out.file("word/comments.xml")?.asText() ?? "";
    const types = out.file("[Content_Types].xml")!.asText();
    const rels = out.file("word/_rels/document.xml.rels")!.asText();

    // 1. Redline applied (tracked change present).
    expect(doc).toMatch(/<w:ins\b/);
    expect(doc).toMatch(/<w:del\b/);

    // 2. Comment anchored in the document.
    expect(doc).toMatch(/<w:commentRangeStart\b/);
    expect(doc).toMatch(/<w:commentRangeEnd\b/);
    expect(doc).toMatch(/<w:commentReference\b/);

    // 3. Comment body carries the shared composer's content.
    expect(comments).toMatch(/<w:comment\b/);
    expect(comments).toContain("High risk");
    expect(comments).toContain("Deviates from your playbook");
    expect(comments).toContain("liability.uncapped");
    expect(comments).toContain("(verified)");

    // 4. Part is declared + linked so Word opens it without repair.
    expect(types).toContain("wordprocessingml.comments+xml");
    expect(rels).toContain("relationships/comments");
    expect(rels).toContain('Target="comments.xml"');
  });

  it("adds NO comment part in clean mode (keeps clean exports clean)", () => {
    const result = injectRedlines({
      originalDocx: makeDocx(),
      clauses: [clauseWithComment()],
      mode: "clean",
      rev: REV,
    });
    const out = new PizZip(result.bytes);
    expect(out.file("word/comments.xml")).toBeNull();
    expect(out.file("[Content_Types].xml")!.asText()).not.toContain(
      "comments+xml",
    );
  });

  it("produces a clean redline (no comment parts) when no clause carries a comment", () => {
    const result = injectRedlines({
      originalDocx: makeDocx(),
      clauses: [{ ...clauseWithComment(), comment: undefined }],
      mode: "redlined",
      rev: REV,
    });
    const out = new PizZip(result.bytes);
    expect(out.file("word/comments.xml")).toBeNull();
  });

  it("keeps comment ids paired across document.xml and comments.xml (no orphans → opens without repair)", () => {
    const second: EngineClause = {
      id: "c2",
      position: 1,
      searchAnchor: null,
      clauseText: CLAUSE_TEXT_2,
      sectionTitle: "Termination",
      op: "replace",
      newText:
        "Either party may terminate this agreement on thirty (30) days' written notice.",
      comment: composeClauseComment({
        riskLevel: "medium",
        summary: "Immediate termination with no cure period.",
        reasoning: "No notice or cure window for the counterparty.",
        ruleIds: ["term.no_notice"],
      }),
    };

    const result = injectRedlines({
      originalDocx: makeDocx([CLAUSE_TEXT, CLAUSE_TEXT_2]),
      clauses: [clauseWithComment(), second],
      mode: "redlined",
      rev: REV,
    });
    expect(result.applied).toBe(2);

    const out = new PizZip(result.bytes);
    const doc = out.file("word/document.xml")!.asText();
    const comments = out.file("word/comments.xml")!.asText();

    // Strict parse (throws on malformed XML) + set equality of comment ids.
    const defined = idsOf(comments, "w:comment").sort();
    const referenced = idsOf(doc, "w:commentReference").sort();
    const ranges = idsOf(doc, "w:commentRangeStart").sort();

    expect(defined).toHaveLength(2);
    expect(referenced).toEqual(defined);
    expect(ranges).toEqual(defined);
  });
});
