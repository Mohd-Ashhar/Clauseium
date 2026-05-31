import { describe, expect, it } from "vitest";
import type { StructuredDocument } from "@/types/ingestion";
import { estimateTopLevel, validateStructure } from "./validate-structure";

function docFromNumbers(nums: Array<number | null>): StructuredDocument {
  return {
    sections: nums.map((n, i) => ({
      title: n === null ? "Preamble" : `Clause ${n}`,
      clauses: [
        {
          id: `c${i}`,
          text:
            n === null
              ? "Recital text that is sufficiently long to be kept as a clause."
              : `${n}. Clause body text that is sufficiently long to count here.`,
          position: i,
        },
      ],
    })),
  };
}

// Numbered-heading text whose estimateTopLevel resolves to `count`.
function textWithNumberedHeadings(count: number): string {
  return Array.from(
    { length: count },
    (_, i) => `${i + 1}. HEADING ${i + 1}\nBody text for clause ${i + 1} here.`,
  ).join("\n");
}

describe("validateStructure", () => {
  it("passes a clean monotonic document", () => {
    const v = validateStructure(docFromNumbers([1, 2, 3, 4, 5, 6]), textWithNumberedHeadings(6));
    expect(v.valid).toBe(true);
    expect(v.problems).toEqual([]);
    expect(v.topLevelCount).toBe(6);
    expect(v.estimatedCount).toBe(6);
  });

  it("passes a single schedule renumber restart (1,2,1,2)", () => {
    const v = validateStructure(docFromNumbers([1, 2, 1, 2]), textWithNumberedHeadings(2));
    expect(v.problems).not.toContain("non_monotonic");
    expect(v.problems).not.toContain("duplicate_numbers");
  });

  it("flags an adjacent duplicate number", () => {
    const v = validateStructure(
      docFromNumbers([23, 24, 25, 25, 26]),
      textWithNumberedHeadings(26),
    );
    expect(v.problems).toContain("duplicate_numbers");
    expect(v.duplicateNumbers).toContain(25);
  });

  it("flags scrambled (non-monotonic) numbering", () => {
    // many descents — the old broken parser's signature
    const v = validateStructure(
      docFromNumbers([1, 2, 3, 4, 1, 9, 2, 5, 6, 3]),
      textWithNumberedHeadings(9),
    );
    expect(v.problems).toContain("non_monotonic");
    expect(v.valid).toBe(false);
  });

  it("flags a collapsed parse against the text estimate", () => {
    // Text clearly has ~30 numbered clauses but the parser produced only 3.
    const v = validateStructure(docFromNumbers([1, 2, 3]), textWithNumberedHeadings(30));
    expect(v.problems).toContain("count_deviation");
    expect(v.valid).toBe(false);
  });

  it("is lenient for short NDAs (few clauses, low estimate)", () => {
    const v = validateStructure(docFromNumbers([1, 2]), textWithNumberedHeadings(2));
    expect(v.valid).toBe(true);
  });

  it("estimateTopLevel finds the largest 1..K run, ignoring stray fragments", () => {
    const text = [
      "1. ALPHA",
      "2. BETA",
      "3. GAMMA",
      "99 of this agreement is a fragment, not a clause.",
    ].join("\n");
    expect(estimateTopLevel(text)).toBe(3);
  });
});
