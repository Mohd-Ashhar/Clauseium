import { describe, it, expect } from "vitest";
import { extractCitations } from "./extract";

describe("extractCitations", () => {
  it("returns empty for plain text", () => {
    expect(extractCitations("nothing to see")).toHaveLength(0);
    expect(extractCitations("")).toHaveLength(0);
  });

  it("parses a single well-formed citation with year", () => {
    const out = extractCitations(
      "see [CITE: Indian Contract Act | 73 | 1872] for damages",
    );
    expect(out).toHaveLength(1);
    expect(out[0].caseOrStatute).toBe("Indian Contract Act");
    expect(out[0].sectionOrCitation).toBe("73");
    expect(out[0].year).toBe(1872);
    expect(out[0].formatValid).toBe(true);
  });

  it("parses a citation without a year", () => {
    const out = extractCitations("[CITE: DPDP Act | 8(1)]");
    expect(out).toHaveLength(1);
    expect(out[0].year).toBeNull();
    expect(out[0].formatValid).toBe(true);
  });

  it("handles weird whitespace", () => {
    const out = extractCitations(
      "[CITE:   Indian   Contract   Act  |  73   |   1872  ]",
    );
    expect(out).toHaveLength(1);
    expect(out[0].caseOrStatute).toBe("Indian   Contract   Act");
    expect(out[0].sectionOrCitation).toBe("73");
  });

  it("extracts multiple citations and dedupes by raw token", () => {
    const text = `
      first [CITE: ICA | 73 | 1872]
      second [CITE: DPDP | 8(1) | 2023]
      duplicate [CITE: ICA | 73 | 1872]
    `;
    const out = extractCitations(text);
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.sectionOrCitation).sort()).toEqual(["73", "8(1)"]);
  });

  it("flags malformed year as formatValid=false but still extracts", () => {
    const out = extractCitations("[CITE: ICA | 73 | abcd]");
    expect(out).toHaveLength(1);
    expect(out[0].formatValid).toBe(false);
    expect(out[0].year).toBeNull();
  });

  it("ignores broken brackets", () => {
    expect(extractCitations("[CITE: missing pipe]")).toHaveLength(0);
    expect(extractCitations("[CITE: a | ]")).toHaveLength(0);
  });

  it("assigns deterministic ids", () => {
    const a = extractCitations("[CITE: ICA | 73 | 1872]");
    const b = extractCitations("[CITE: ICA | 73 | 1872]");
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].id).toMatch(/^[a-f0-9]{16}$/);
  });
});
