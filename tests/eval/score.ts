// Deterministic accuracy scorer. Mirrors the real no-LLM analysis path:
//   substantive gate → rule classification → rule engine,
// plus the playbook missing-clause detector over the whole document.
//
// File-specific imports (not the @/lib/risk barrel) so we never pull in the
// server-only LLM analyzers. None of these modules import "server-only".
import { classifyByRules } from "@/lib/classification/rule-classifier";
import { runRules } from "@/lib/risk/rule-engine";
import { isSubstantiveClause } from "@/lib/ingestion/substantive-check";
import { detectContractType } from "@/lib/risk/playbooks/detect";
import { checkPlaybook } from "@/lib/risk/playbooks/check";
import type { GoldFixture } from "./types";

export interface Ratio {
  hit: number;
  total: number;
  ratio: number;
}

function ratio(hit: number, total: number): Ratio {
  return { hit, total, ratio: total === 0 ? 1 : hit / total };
}

export interface FixtureResult {
  id: string;
  ruleMisses: { clause: string; missing: string[]; got: string[] }[];
  cleanViolations: { clause: string; fired: string[] }[];
  missingMisses: string[]; // expected-missing that were NOT flagged
  missingFalsePositives: string[]; // expected-present that WERE flagged missing
  classMisses: { clause: string; expected: string; got: string }[];
  typeOk: boolean;
  detectedType: string;
  substantiveDrops: string[];
}

export interface EvalReport {
  fixtures: FixtureResult[];
  ruleRecall: Ratio; // mustFire rules that fired
  cleanPrecision: Ratio; // clean clauses with no high/medium finding
  missingRecall: Ratio; // expected-missing protections flagged
  missingPrecision: Ratio; // expected-present protections NOT flagged missing
  typeAccuracy: Ratio;
  classificationAccuracy: Ratio;
  substantiveDrops: number;
}

const ACTIONABLE = new Set(["high", "medium"]);

export function scoreFixtures(fixtures: GoldFixture[]): EvalReport {
  let ruleHit = 0,
    ruleTotal = 0;
  let cleanOk = 0,
    cleanTotal = 0;
  let missHit = 0,
    missTotal = 0;
  let missPresentOk = 0,
    missPresentTotal = 0;
  let typeOk = 0;
  let clsOk = 0,
    clsTotal = 0;
  let drops = 0;

  const results: FixtureResult[] = [];

  for (const fx of fixtures) {
    const fullText = [fx.title, ...fx.clauses.map((c) => c.text)].join("\n\n");
    const ruleMisses: FixtureResult["ruleMisses"] = [];
    const cleanViolations: FixtureResult["cleanViolations"] = [];
    const classMisses: FixtureResult["classMisses"] = [];
    const substantiveDrops: string[] = [];

    for (const clause of fx.clauses) {
      const substantive = isSubstantiveClause(clause.text);
      if (!substantive && (clause.mustFire.length > 0 || clause.clean)) {
        drops += 1;
        substantiveDrops.push(clause.text.slice(0, 60));
      }

      const findings = substantive
        ? runRules({
            clauseId: "x",
            clauseText: clause.text,
            category: clause.category,
          })
        : [];
      const firedIds = findings.map((f) => f.ruleId);
      const firedSet = new Set(firedIds);

      // Recall: each mustFire rule must be present.
      const missing = clause.mustFire.filter((id) => !firedSet.has(id));
      ruleTotal += clause.mustFire.length;
      ruleHit += clause.mustFire.length - missing.length;
      if (missing.length > 0) {
        ruleMisses.push({ clause: clause.text.slice(0, 60), missing, got: firedIds });
      }

      // Precision: clean clauses must not fire any high/medium finding.
      if (clause.clean) {
        cleanTotal += 1;
        const actionable = findings
          .filter((f) => ACTIONABLE.has(f.level))
          .map((f) => f.ruleId);
        if (actionable.length === 0) cleanOk += 1;
        else cleanViolations.push({ clause: clause.text.slice(0, 60), fired: actionable });
      }

      // Rule-classifier accuracy (soft; real pipeline adds the LLM classifier).
      const predCat = classifyByRules(clause.text).top?.category ?? "other";
      clsTotal += 1;
      if (predCat === clause.category) clsOk += 1;
      else classMisses.push({ clause: clause.text.slice(0, 60), expected: clause.category, got: predCat });
    }

    // Document-level: type detection + playbook missing-clause check.
    const detected = detectContractType(fx.title, fullText);
    const tOk = detected.type === fx.contractType;
    if (tOk) typeOk += 1;

    const playbook = checkPlaybook(detected.type, fullText);
    const flagged = new Set(playbook.missing.map((m) => m.key));

    const expMissing = fx.expectedMissing ?? [];
    const expPresent = fx.expectedPresent ?? [];
    const missingMisses = expMissing.filter((k) => !flagged.has(k));
    const missingFalsePositives = expPresent.filter((k) => flagged.has(k));
    missTotal += expMissing.length;
    missHit += expMissing.length - missingMisses.length;
    missPresentTotal += expPresent.length;
    missPresentOk += expPresent.length - missingFalsePositives.length;

    results.push({
      id: fx.id,
      ruleMisses,
      cleanViolations,
      missingMisses,
      missingFalsePositives,
      classMisses,
      typeOk: tOk,
      detectedType: detected.type,
      substantiveDrops,
    });
  }

  return {
    fixtures: results,
    ruleRecall: ratio(ruleHit, ruleTotal),
    cleanPrecision: ratio(cleanOk, cleanTotal),
    missingRecall: ratio(missHit, missTotal),
    missingPrecision: ratio(missPresentOk, missPresentTotal),
    typeAccuracy: ratio(typeOk, fixtures.length),
    classificationAccuracy: ratio(clsOk, clsTotal),
    substantiveDrops: drops,
  };
}
