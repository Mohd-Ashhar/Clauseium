import { describe, it, expect } from "vitest";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PizZip from "pizzip";
import { injectRedlines } from "@/lib/export/ooxml/inject-redlines";
import { normalizeWithMap } from "@/lib/export/ooxml/normalize-map";
import {
  normalizeForAnchor,
  computeSearchAnchor,
} from "@/lib/ingestion/search-anchor";
import type { EngineClause, RevisionMeta } from "@/lib/export/ooxml/types";

const REV: RevisionMeta = { author: "Clauseium AI", dateIso: "2026-05-31T00:00:00Z" };

const CLAUSE_A =
  "In no event shall either party's aggregate liability exceed the fees paid.";
const CLAUSE_B =
  "Confidential Information means any non-public information disclosed by a party.";
const NEW_A =
  "Each party's aggregate liability shall not exceed the fees paid in the twelve (12) months preceding the claim.";

async function fixtureDocx(paras: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: paras.map(
          (p) => new Paragraph({ children: [new TextRun(p)] }),
        ),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function documentXml(bytes: Buffer): string {
  const zip = new PizZip(bytes);
  const f = zip.file("word/document.xml");
  if (!f) throw new Error("no document.xml");
  return f.asText();
}

function clause(overrides: Partial<EngineClause> & { clauseText: string }): EngineClause {
  return {
    id: overrides.id ?? "c1",
    position: overrides.position ?? 0,
    searchAnchor: overrides.searchAnchor ?? computeSearchAnchor(overrides.clauseText),
    clauseText: overrides.clauseText,
    sectionTitle: overrides.sectionTitle ?? null,
    op: overrides.op ?? "replace",
    newText: overrides.newText ?? "",
  };
}

describe("normalizeWithMap", () => {
  it("matches normalizeForAnchor exactly", () => {
    const samples = [
      "  Hello   world  ",
      "Curly “quotes” and ‘apostrophes’",
      "soft­hyphen here",
      "tabs\tand\nnewlines collapse",
      "Plain text.",
      "",
    ];
    for (const s of samples) {
      expect(normalizeWithMap(s).norm).toBe(normalizeForAnchor(s));
    }
  });

  it("maps normalized indices back to source positions", () => {
    const { norm, normToRaw } = normalizeWithMap("ab  cd");
    expect(norm).toBe("ab cd");
    // 'c' is norm index 3 → raw index 4
    expect(norm[3]).toBe("c");
    expect(normToRaw[3]).toBe(4);
  });
});

describe("injectRedlines (redlined mode)", () => {
  it("wraps the matched clause in a tracked change and leaves others intact", async () => {
    const docx = await fixtureDocx([CLAUSE_A, CLAUSE_B]);
    const res = injectRedlines({
      originalDocx: docx,
      mode: "redlined",
      rev: REV,
      clauses: [clause({ clauseText: CLAUSE_A, newText: NEW_A })],
    });

    expect(res.applied).toBe(1);
    expect(res.fallback).toBe(0);

    const xml = documentXml(res.bytes);
    expect(xml).toContain("<w:del");
    expect(xml).toContain("<w:delText");
    expect(xml).toContain("<w:ins");
    expect(xml).toContain('w:author="Clauseium AI"');
    // original wording is struck (kept as delText), new wording inserted
    expect(xml).toContain("the fees paid in the twelve (12) months");
    // the untouched clause is still present verbatim
    expect(xml).toContain("Confidential Information means");
  });

  it("re-zips a valid package: every original part survives", async () => {
    const docx = await fixtureDocx([CLAUSE_A, CLAUSE_B]);
    const before = new PizZip(docx);
    const beforeNames = Object.keys(before.files).sort();

    const res = injectRedlines({
      originalDocx: docx,
      mode: "redlined",
      rev: REV,
      clauses: [clause({ clauseText: CLAUSE_A, newText: NEW_A })],
    });
    const after = new PizZip(res.bytes);
    const afterNames = Object.keys(after.files).sort();
    expect(afterNames).toEqual(beforeNames);
  });

  it("assigns unique revision ids above any existing ones", async () => {
    const docx = await fixtureDocx([CLAUSE_A, CLAUSE_B]);
    const res = injectRedlines({
      originalDocx: docx,
      mode: "redlined",
      rev: REV,
      clauses: [
        clause({ id: "a", position: 0, clauseText: CLAUSE_A, newText: NEW_A }),
        clause({ id: "b", position: 1, clauseText: CLAUSE_B, newText: "Redacted." }),
      ],
    });
    expect(res.applied).toBe(2);
    const xml = documentXml(res.bytes);
    const ids = [...xml.matchAll(/w:id="(\d+)"/g)].map((m) => Number(m[1]));
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});

describe("injectRedlines (clean mode)", () => {
  it("applies the final text with no tracked-change markup", async () => {
    const docx = await fixtureDocx([CLAUSE_A, CLAUSE_B]);
    const res = injectRedlines({
      originalDocx: docx,
      mode: "clean",
      rev: REV,
      clauses: [clause({ clauseText: CLAUSE_A, newText: NEW_A })],
    });
    const xml = documentXml(res.bytes);
    expect(xml).not.toContain("<w:del");
    expect(xml).not.toContain("<w:ins");
    expect(xml).toContain("the fees paid in the twelve (12) months");
    expect(xml).not.toContain("aggregate liability exceed the fees paid");
  });
});

describe("injectRedlines (fallback + insert)", () => {
  it("appends a proposal when a clause cannot be located", async () => {
    const docx = await fixtureDocx([CLAUSE_B]); // CLAUSE_A is absent
    const res = injectRedlines({
      originalDocx: docx,
      mode: "redlined",
      rev: REV,
      clauses: [clause({ clauseText: CLAUSE_A, newText: NEW_A })],
    });
    expect(res.fallback).toBe(1);
    const xml = documentXml(res.bytes);
    expect(xml).toContain("proposed additions");
  });

  it("inserts a missing clause as a tracked addition", async () => {
    const docx = await fixtureDocx([CLAUSE_B]);
    const res = injectRedlines({
      originalDocx: docx,
      mode: "redlined",
      rev: REV,
      clauses: [
        clause({
          op: "insert",
          clauseText: "",
          sectionTitle: "Governing Law",
          newText: "This Agreement is governed by the laws of India.",
        }),
      ],
    });
    expect(res.applied).toBe(1);
    const xml = documentXml(res.bytes);
    expect(xml).toContain("<w:ins");
    expect(xml).toContain("governed by the laws of India");
  });

  it("leaves the document unchanged for skip clauses", async () => {
    const docx = await fixtureDocx([CLAUSE_A]);
    const res = injectRedlines({
      originalDocx: docx,
      mode: "redlined",
      rev: REV,
      clauses: [clause({ op: "skip", clauseText: CLAUSE_A })],
    });
    expect(res.skipped).toBe(1);
    expect(res.applied).toBe(0);
    const xml = documentXml(res.bytes);
    expect(xml).not.toContain("<w:del");
    expect(xml).not.toContain("<w:ins");
  });
});
