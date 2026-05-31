import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectStructure, topLevelNumbers } from "./structure";
import { validateStructure } from "./validate-structure";

// Regression guard for the IPPB Master Service Agreement — a real 24-page,
// 58-clause Indian commercial MSA whose normalized text is committed as a
// fixture. The old parser produced ~60 chaotic clauses (duplicate numbers,
// sub-items as top-level clauses, continuation fragments as clauses). The
// sequence-aware parser must recover exactly the 58 numbered clauses. Fully
// offline & deterministic (no PDF parse, no network).
const FIXTURE = resolve("tests/fixtures/ingestion/ippb-msa-normalized.txt");

describe("IPPB MSA parser regression", () => {
  const text = readFileSync(FIXTURE, "utf8");
  const doc = detectStructure(text);
  const numbered = topLevelNumbers(doc).filter((n): n is number => n !== null);

  it("recovers exactly the 58 numbered top-level clauses, unique and complete", () => {
    expect(numbered).toEqual(Array.from({ length: 58 }, (_, i) => i + 1));
  });

  it("has no duplicate clause numbers", () => {
    expect(new Set(numbered).size).toBe(numbered.length);
  });

  it("passes structural validation (no LLM repair needed)", () => {
    const v = validateStructure(doc, text);
    expect(v.valid).toBe(true);
    expect(v.topLevelCount).toBe(58);
    expect(v.estimatedCount).toBe(58);
  });

  it("attaches the correct headings to key clauses", () => {
    const titleOf = (n: number) =>
      doc.sections.find((s) => s.clauses.some((c) => c.text.startsWith(`${n}.`)))?.title ?? "";
    expect(titleOf(14)).toMatch(/COMPLIANCE WITH LAWS/i);
    expect(titleOf(25)).toMatch(/PROPRIETARY RIGHTS/i);
    expect(titleOf(39)).toMatch(/Confidentiality/i);
    expect(titleOf(42)).toMatch(/Limitation of Liability/i);
  });

  it("folds sub-clauses into their parent (4(e)(1) is inside clause 4, not its own clause)", () => {
    const clause4 = doc.sections
      .flatMap((s) => s.clauses)
      .find((c) => c.text.startsWith("4."));
    expect(clause4?.text).toMatch(/quality of Service rendered/i);
  });
});
