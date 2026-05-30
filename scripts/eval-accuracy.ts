/* eslint-disable no-console */
import { FIXTURES } from "../tests/eval/fixtures";
import { scoreFixtures } from "../tests/eval/score";

/**
 * Accuracy eval runner.
 *
 *   npm run eval:report            # deterministic report (no API keys)
 *   npm run eval:report -- --llm   # also smoke-test the LLM layers
 *                                  # (needs ANTHROPIC_API_KEY; metered)
 *
 * The deterministic metrics here are the same ones asserted in CI by
 * tests/eval/accuracy.test.ts. The --llm mode is a QUALITATIVE smoke test of
 * the per-clause and whole-document analyzers (it prints what they produce for
 * inspection) — it is not scored, because LLM output is free-form.
 */

function pct(r: { ratio: number; hit: number; total: number }): string {
  return `${(r.ratio * 100).toFixed(1)}%  (${r.hit}/${r.total})`;
}

function line(label: string, value: string): void {
  console.log(`  ${label.padEnd(36)} ${value}`);
}

async function main() {
  const report = scoreFixtures(FIXTURES);

  console.log("\n=== Clauseium accuracy eval (deterministic layer) ===");
  console.log(
    `Fixtures: ${FIXTURES.length}  ·  clauses: ${report.classificationAccuracy.total}\n`,
  );

  console.log("Rule engine (given correct classification):");
  line("recall (targeted rules fire)", pct(report.ruleRecall));
  line("precision (clean clauses stay clean)", pct(report.cleanPrecision));

  console.log("\nMissing-clause detector (playbook):");
  line("recall", pct(report.missingRecall));
  line("precision", pct(report.missingPrecision));

  console.log("\nSupporting:");
  line("contract-type accuracy", pct(report.typeAccuracy));
  line("rule-classifier accuracy", pct(report.classificationAccuracy));
  line("clauses wrongly filtered (Phase 0)", String(report.substantiveDrops));

  // Detail any misses so failures are actionable.
  const ruleMisses = report.fixtures.filter((f) => f.ruleMisses.length > 0);
  if (ruleMisses.length > 0) {
    console.log("\nRule-engine recall misses:");
    for (const f of ruleMisses) {
      for (const m of f.ruleMisses) {
        console.log(
          `  - ${f.id}: "${m.clause}…" missing ${JSON.stringify(m.missing)} got ${JSON.stringify(m.got)}`,
        );
      }
    }
  }

  const cleanViolations = report.fixtures.filter((f) => f.cleanViolations.length > 0);
  if (cleanViolations.length > 0) {
    console.log("\nClean-clause false positives:");
    for (const f of cleanViolations) {
      for (const v of f.cleanViolations) {
        console.log(`  - ${f.id}: "${v.clause}…" fired ${JSON.stringify(v.fired)}`);
      }
    }
  }

  const missMisses = report.fixtures.filter(
    (f) => f.missingMisses.length > 0 || f.missingFalsePositives.length > 0,
  );
  if (missMisses.length > 0) {
    console.log("\nMissing-clause misses / false positives:");
    for (const f of missMisses) {
      if (f.missingMisses.length > 0)
        console.log(`  - ${f.id}: NOT flagged ${JSON.stringify(f.missingMisses)}`);
      if (f.missingFalsePositives.length > 0)
        console.log(
          `  - ${f.id}: wrongly flagged present-as-missing ${JSON.stringify(f.missingFalsePositives)}`,
        );
    }
  }

  const typeMisses = report.fixtures.filter((f) => !f.typeOk);
  if (typeMisses.length > 0) {
    console.log("\nContract-type misdetections:");
    for (const f of typeMisses) console.log(`  - ${f.id}: detected ${f.detectedType}`);
  }

  if (process.argv.includes("--llm")) {
    await runLlmSmoke();
  } else {
    console.log("\n(Run with --llm to also smoke-test the AI analyzers.)\n");
  }
}

async function runLlmSmoke() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n--llm requested but ANTHROPIC_API_KEY is not set; skipping.\n");
    return;
  }
  // Dynamic import so the deterministic path never loads the SDK.
  const { analyzeClauseRisks } = await import("../src/lib/risk/orchestrator");
  const { analyzeDocument } = await import("../src/lib/risk/document-analyzer");

  console.log("\n=== LLM layer smoke test (qualitative, not scored) ===");
  for (const fx of FIXTURES.filter((f) => f.id.startsWith("doc-"))) {
    console.log(`\n# ${fx.id} — "${fx.title}"`);
    const inputs = fx.clauses.map((c, i) => ({
      clauseId: `${fx.id}-${i}`,
      clauseText: c.text,
      category: c.category,
      classificationConfidence: 0.8,
    }));
    try {
      const risks = await analyzeClauseRisks(inputs, { maxLlmCalls: 20 });
      const flagged = risks.filter(
        (r) => r.riskLevel === "high" || r.riskLevel === "medium",
      );
      console.log(`  per-clause: ${flagged.length}/${risks.length} flagged high/medium`);
      for (const r of flagged) console.log(`    · ${r.riskLevel.toUpperCase()}: ${r.issue}`);

      const doc = await analyzeDocument({
        contractTitle: fx.title,
        clauses: fx.clauses.map((c, i) => ({
          id: `${fx.id}-${i}`,
          position: i,
          sectionTitle: null,
          text: c.text,
        })),
      });
      console.log(`  document: posture=${doc.overallPosture} degraded=${doc.degraded}`);
      console.log(`    missing: ${doc.missingProtections.map((m) => m.key).join(", ") || "(none)"}`);
      console.log(`    cross-clause: ${doc.crossClauseIssues.length}  one-sided: ${doc.oneSidedTerms.length}`);
    } catch (err) {
      console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
