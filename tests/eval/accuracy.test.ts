import { describe, it, expect, vi } from "vitest";

// Defensive: some transitive imports may pull "server-only".
vi.mock("server-only", () => ({}));

import { FIXTURES } from "./fixtures";
import { scoreFixtures } from "./score";

// Regression thresholds for the DETERMINISTIC analysis layer (no LLM). These
// guard the recall/precision the rule engine + playbook deliver on their own.
// The LLM layers add recall on top and are evaluated out-of-band by
// scripts/eval-accuracy.ts (needs ANTHROPIC_API_KEY).
const T = {
  ruleRecallMin: 1.0, // every targeted rule must fire (fixtures are authored for this)
  cleanPrecisionMin: 1.0, // no false positives on clean clauses
  missingRecallMin: 0.9,
  missingPrecisionMin: 1.0,
  typeAccuracyMin: 0.9,
  classificationAccuracyMin: 0.55, // soft: real pipeline adds the LLM classifier
};

describe("accuracy eval (deterministic layer)", () => {
  const report = scoreFixtures(FIXTURES);

  it("has a meaningful fixture set", () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(50);
  });

  it("never drops a clause we expect findings from (Phase 0 filter guard)", () => {
    const offenders = report.fixtures
      .filter((f) => f.substantiveDrops.length > 0)
      .map((f) => `${f.id}: ${f.substantiveDrops.join(" | ")}`);
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("meets rule-engine recall (targeted rules fire, given correct classification)", () => {
    const misses = report.fixtures
      .flatMap((f) =>
        f.ruleMisses.map(
          (m) => `${f.id} [${m.clause}] missing ${JSON.stringify(m.missing)} got ${JSON.stringify(m.got)}`,
        ),
      );
    expect(report.ruleRecall.ratio, misses.join("\n")).toBeGreaterThanOrEqual(
      T.ruleRecallMin,
    );
  });

  it("meets rule-engine precision (no false positives on clean clauses)", () => {
    const fps = report.fixtures
      .filter((f) => f.cleanViolations.length > 0)
      .flatMap((f) =>
        f.cleanViolations.map((v) => `${f.id} [${v.clause}] fired ${JSON.stringify(v.fired)}`),
      );
    expect(report.cleanPrecision.ratio, fps.join("\n")).toBeGreaterThanOrEqual(
      T.cleanPrecisionMin,
    );
  });

  it("meets missing-clause recall", () => {
    const misses = report.fixtures
      .filter((f) => f.missingMisses.length > 0)
      .map((f) => `${f.id}: not flagged ${JSON.stringify(f.missingMisses)}`);
    expect(report.missingRecall.ratio, misses.join("\n")).toBeGreaterThanOrEqual(
      T.missingRecallMin,
    );
  });

  it("meets missing-clause precision (present protections not flagged missing)", () => {
    const fps = report.fixtures
      .filter((f) => f.missingFalsePositives.length > 0)
      .map((f) => `${f.id}: wrongly flagged ${JSON.stringify(f.missingFalsePositives)}`);
    expect(report.missingPrecision.ratio, fps.join("\n")).toBeGreaterThanOrEqual(
      T.missingPrecisionMin,
    );
  });

  it("meets contract-type detection accuracy", () => {
    const misses = report.fixtures
      .filter((f) => !f.typeOk)
      .map((f) => `${f.id}: detected ${f.detectedType}`);
    expect(report.typeAccuracy.ratio, misses.join("\n")).toBeGreaterThanOrEqual(
      T.typeAccuracyMin,
    );
  });

  it("meets rule-classifier accuracy floor (soft)", () => {
    expect(report.classificationAccuracy.ratio).toBeGreaterThanOrEqual(
      T.classificationAccuracyMin,
    );
  });
});
