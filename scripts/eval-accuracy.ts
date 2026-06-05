/* eslint-disable no-console */
import { FIXTURES } from "../tests/eval/fixtures";
import { scoreFixtures } from "../tests/eval/score";
import type { GoldClause } from "../tests/eval/types";

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
    await runLlmScored();
  } else {
    console.log("\n(Run with --llm to also SCORE the full AI pipeline — metered.)\n");
  }
}

// Scored end-to-end eval of the FULL pipeline (rules + per-clause LLM cascade +
// merge) against the gold labels. This is the launch-readiness number the
// deterministic layer can't give: does the production analyzer actually flag the
// risky clauses (recall) and leave clean clauses clean (precision)?
//   recall    = clauses with a mustFire label rated high/medium
//   precision = clean clauses NOT rated high/medium (false-positive guard)
// Metered (one+ LLM call per clause). Use --llm-limit=N to cap clauses analysed.
async function runLlmScored() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n--llm requested but ANTHROPIC_API_KEY is not set; skipping.\n");
    return;
  }
  // Dynamic import so the deterministic path never loads the SDK.
  const { analyzeClauseRisks } = await import("../src/lib/risk/orchestrator");

  const limitArg = process.argv.find((a) => a.startsWith("--llm-limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity;

  // Flatten every labelled clause (risky = has mustFire; clean = clean flag).
  type Labelled = {
    fixture: string;
    clauseId: string;
    text: string;
    category: GoldClause["category"];
    risky: boolean;
    clean: boolean;
  };
  const labelled: Labelled[] = [];
  for (const fx of FIXTURES) {
    fx.clauses.forEach((c, i) => {
      // `clean` is authoritative: a clean clause is scored for PRECISION only,
      // never counted as "risky" for recall — even when it carries a benign
      // mustFire (e.g. gl.indian / juris.indian_exclusive, the "good clause"
      // markers that fire at LOW to confirm a sound clause). Treating those as
      // risky wrongly rewards over-flagging them to medium.
      const risky = c.mustFire.length > 0 && !c.clean;
      if (!risky && !c.clean) return; // unlabelled → skip (not scoreable)
      labelled.push({
        fixture: fx.id,
        clauseId: `${fx.id}-${i}`,
        text: c.text,
        category: c.category,
        risky,
        clean: Boolean(c.clean),
      });
    });
  }
  const scored = labelled.slice(0, Number.isFinite(limit) ? limit : labelled.length);

  console.log(
    `\n=== Full-pipeline LLM eval (scored) — ${scored.length} labelled clause(s) ===`,
  );

  const inputs = scored.map((c) => ({
    clauseId: c.clauseId,
    clauseText: c.text,
    category: c.category,
    classificationConfidence: 0.8,
  }));
  const results = await analyzeClauseRisks(inputs, { maxLlmCalls: inputs.length });
  const byId = new Map(results.map((r) => [r.clauseId, r]));
  const ACTIONABLE = new Set(["high", "medium"]);

  let recallHit = 0,
    recallTotal = 0,
    precOk = 0,
    precTotal = 0;
  const recallMisses: string[] = [];
  const falsePositives: string[] = [];
  for (const c of scored) {
    const lvl = byId.get(c.clauseId)?.riskLevel ?? "standard";
    const actionable = ACTIONABLE.has(lvl);
    if (c.risky) {
      recallTotal += 1;
      if (actionable) recallHit += 1;
      else recallMisses.push(`${c.clauseId} [${c.category}] rated ${lvl}: "${c.text.slice(0, 60)}…"`);
    }
    if (c.clean) {
      precTotal += 1;
      if (!actionable) precOk += 1;
      else falsePositives.push(`${c.clauseId} rated ${lvl}: "${c.text.slice(0, 60)}…"`);
    }
  }

  const fmt = (h: number, t: number) =>
    `${t === 0 ? "n/a" : ((h / t) * 100).toFixed(1) + "%"}  (${h}/${t})`;
  console.log("\nFull pipeline (rules + LLM cascade):");
  line("recall (risky clauses flagged high/med)", fmt(recallHit, recallTotal));
  line("precision (clean clauses kept clean)", fmt(precOk, precTotal));
  if (recallMisses.length > 0) {
    console.log("\nRecall misses (risky but not flagged):");
    for (const m of recallMisses) console.log(`  - ${m}`);
  }
  if (falsePositives.length > 0) {
    console.log("\nFalse positives (clean but flagged high/med):");
    for (const m of falsePositives) console.log(`  - ${m}`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
