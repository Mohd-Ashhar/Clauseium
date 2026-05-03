import { describe, it, expect } from "vitest";
import { applyQualityGate, DROP_BELOW, FLAG_BELOW } from "./gate";
import type { ExtractedCitation, VerificationResult } from "./types";

function citation(id: string, valid = true): ExtractedCitation {
  return {
    id,
    raw: `[CITE: foo | ${id}]`,
    caseOrStatute: "foo",
    sectionOrCitation: id,
    year: null,
    formatValid: valid,
  };
}

function res(
  id: string,
  status: VerificationResult["status"],
  confidence: number,
): VerificationResult {
  return {
    citation: citation(id, status !== "unverified" || confidence > 0),
    status,
    confidence,
    sourceUrl: status === "verified" ? "https://example.com" : undefined,
    local: {
      checked: true,
      confirmed: status !== "unverified",
      relevance: confidence,
      latencyMs: 10,
      error: null,
    },
    kanoon: {
      checked: true,
      confirmed: status === "verified",
      relevance: 0,
      latencyMs: 50,
      error: null,
    },
  };
}

describe("applyQualityGate", () => {
  it("returns trust=1 and empty arrays when nothing extracted", () => {
    const out = applyQualityGate([]);
    expect(out.citations).toEqual([]);
    expect(out.trustScore).toBe(1);
    expect(out.counts.extracted).toBe(0);
  });

  it("drops unverified citations", () => {
    const out = applyQualityGate([res("a", "unverified", 0)]);
    expect(out.citations).toHaveLength(0);
    expect(out.counts.dropped).toBe(1);
    expect(out.trustScore).toBe(0);
  });

  it("drops below DROP_BELOW even if status looks ok", () => {
    const out = applyQualityGate([
      res("a", "partially_verified", DROP_BELOW - 0.05),
    ]);
    expect(out.citations).toHaveLength(0);
    expect(out.counts.dropped).toBe(1);
  });

  it("flags partially_verified between DROP_BELOW and FLAG_BELOW", () => {
    const out = applyQualityGate([res("a", "partially_verified", 0.5)]);
    expect(out.citations).toHaveLength(1);
    expect(out.citations[0].warning).toBeDefined();
    expect(out.counts.partial).toBe(1);
  });

  it("does not flag a verified citation at high confidence", () => {
    const out = applyQualityGate([res("a", "verified", 0.95)]);
    expect(out.citations).toHaveLength(1);
    expect(out.citations[0].warning).toBeUndefined();
    expect(out.counts.verified).toBe(1);
  });

  it("flags verified citation if confidence still under FLAG_BELOW", () => {
    const out = applyQualityGate([res("a", "verified", FLAG_BELOW - 0.05)]);
    expect(out.citations).toHaveLength(1);
    expect(out.citations[0].warning).toBeDefined();
  });

  it("computes trust score across mixed outcomes", () => {
    const out = applyQualityGate([
      res("a", "verified", 0.9),
      res("b", "partially_verified", 0.5),
      res("c", "unverified", 0),
      res("d", "unverified", 0),
    ]);
    // (0.9 + 0.5 + 0 + 0) / 4 = 0.35
    expect(out.trustScore).toBeCloseTo(0.35, 3);
    expect(out.citations).toHaveLength(2);
    expect(out.counts.extracted).toBe(4);
    expect(out.counts.verified).toBe(1);
    expect(out.counts.partial).toBe(1);
    expect(out.counts.dropped).toBe(2);
  });
});
