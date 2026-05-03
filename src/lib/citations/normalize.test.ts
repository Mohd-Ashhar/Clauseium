import { describe, it, expect } from "vitest";
import {
  canonicalize,
  jaccard,
  extractSectionNumber,
  extractYear,
} from "./normalize";

describe("canonicalize", () => {
  it("collapses whitespace and lowercases", () => {
    expect(canonicalize("  Indian   Contract   Act  ")).toBe(
      "indian contract act",
    );
  });

  it("expands ICA alias", () => {
    expect(canonicalize("ICA s. 73")).toBe("indian contract act section 73");
  });

  it("expands S./Sec./Section forms consistently", () => {
    expect(canonicalize("S. 73 of ICA, 1872")).toBe(
      "section 73 of indian contract act, 1872",
    );
    expect(canonicalize("Sec 73")).toBe("section 73");
    expect(canonicalize("Section 73")).toBe("section 73");
  });

  it("expands DPDP alias", () => {
    expect(canonicalize("DPDP Act 8(1)")).toBe(
      "digital personal data protection act 8(1)",
    );
  });

  it("strips trailing punctuation and quotes", () => {
    expect(canonicalize('"Companies Act."')).toBe("companies act");
  });
});

describe("jaccard", () => {
  it("returns 1 for identical strings", () => {
    expect(jaccard("Indian Contract Act 73", "Indian Contract Act 73")).toBe(1);
  });

  it("returns 0 for disjoint", () => {
    expect(jaccard("apple banana", "carrot delta")).toBe(0);
  });

  it("scores partial overlap > 0", () => {
    const score = jaccard("Indian Contract Act 73", "Contract Act 73 1872");
    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThan(1);
  });

  it("uses canonicalized aliases", () => {
    const score = jaccard("ICA Section 73", "Indian Contract Act Section 73");
    expect(score).toBe(1);
  });
});

describe("extractSectionNumber", () => {
  it("parses bare section numbers", () => {
    expect(extractSectionNumber("73")).toBe("73");
    expect(extractSectionNumber("8(1)")).toBe("8(1)");
  });

  it("parses 'Section N'", () => {
    expect(extractSectionNumber("Section 73")).toBe("73");
    expect(extractSectionNumber("section 8(1)")).toBe("8(1)");
  });

  it("returns null for non-numeric", () => {
    expect(extractSectionNumber("foo bar")).toBeNull();
  });
});

describe("extractYear", () => {
  it("finds 4-digit years", () => {
    expect(extractYear("Act of 1872")).toBe(1872);
    expect(extractYear("DPDP 2023")).toBe(2023);
  });

  it("returns null when missing", () => {
    expect(extractYear("no year here")).toBeNull();
  });
});
