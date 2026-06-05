import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  cosineSim,
  ruleSignature,
  bucketReps,
  semDedupThreshold,
  type SemDedupRep,
} from "./semantic-dedup";
import type { RuleFinding } from "./types";

describe("cosineSim", () => {
  it("is 1 for identical vectors and 0 for orthogonal", () => {
    expect(cosineSim([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  it("is high for near-identical vectors, ~0.5 at 60 degrees", () => {
    expect(cosineSim([1, 0, 0], [0.999, 0.01, 0])).toBeGreaterThan(0.99);
    expect(cosineSim([1, 0], [0.5, Math.sqrt(3) / 2])).toBeCloseTo(0.5, 3);
  });
  it("handles degenerate inputs", () => {
    expect(cosineSim([], [])).toBe(0);
    expect(cosineSim([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSim([0, 0], [1, 1])).toBe(0);
  });
});

describe("ruleSignature", () => {
  it("is empty for no findings and order-stable", () => {
    expect(ruleSignature([])).toBe("");
    const a = [
      { ruleId: "lol.uncapped", level: "high" },
      { ruleId: "indem.one_sided", level: "high" },
    ] as RuleFinding[];
    const b = [
      { ruleId: "indem.one_sided", level: "high" },
      { ruleId: "lol.uncapped", level: "high" },
    ] as RuleFinding[];
    expect(ruleSignature(a)).toBe(ruleSignature(b)); // sorted → stable
  });
  it("distinguishes a different level", () => {
    const a = [{ ruleId: "x", level: "high" }] as RuleFinding[];
    const b = [{ ruleId: "x", level: "medium" }] as RuleFinding[];
    expect(ruleSignature(a)).not.toBe(ruleSignature(b));
  });
});

describe("bucketReps", () => {
  const rep = (
    category: string,
    sig: string,
    embedding: number[],
  ): SemDedupRep => ({ category, ruleSignature: sig, embedding });

  it("merges only above threshold, same category, same rule signature", () => {
    const reps = [
      rep("other", "", [1, 0, 0]), // 0: head
      rep("other", "", [1, 0, 0]), // 1: identical → joins 0
      rep("indemnification", "", [1, 0, 0]), // 2: same vec, diff category → own bucket
      rep("other", "x:high", [1, 0, 0]), // 3: same vec+cat, diff signature → own bucket
      rep("other", "", [0, 1, 0]), // 4: orthogonal → own bucket
    ];
    expect(bucketReps(reps, 0.97)).toEqual([0, 0, 2, 3, 4]);
  });

  it("does not merge when below threshold", () => {
    const reps = [
      rep("other", "", [1, 0]),
      rep("other", "", [0.5, Math.sqrt(3) / 2]), // 60° → cos 0.5 < 0.97
    ];
    expect(bucketReps(reps, 0.97)).toEqual([0, 1]);
  });
});

describe("semDedupThreshold", () => {
  it("defaults to 0.97 and honours a valid override", () => {
    const orig = process.env.RISK_SEMDEDUP_THRESHOLD;
    delete process.env.RISK_SEMDEDUP_THRESHOLD;
    expect(semDedupThreshold()).toBe(0.97);
    process.env.RISK_SEMDEDUP_THRESHOLD = "0.99";
    expect(semDedupThreshold()).toBe(0.99);
    process.env.RISK_SEMDEDUP_THRESHOLD = "bogus";
    expect(semDedupThreshold()).toBe(0.97);
    if (orig === undefined) delete process.env.RISK_SEMDEDUP_THRESHOLD;
    else process.env.RISK_SEMDEDUP_THRESHOLD = orig;
  });
});
