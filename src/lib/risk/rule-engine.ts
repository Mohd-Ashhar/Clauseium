import type { ClassificationLabel } from "@/lib/classification/categories";
import { rulesForCategory } from "./rules";
import type { RuleCtx, RuleFinding } from "./types";

export interface RuleEngineInput {
  clauseId: string;
  clauseText: string;
  category: ClassificationLabel;
}

export function runRules(input: RuleEngineInput): RuleFinding[] {
  const text = input.clauseText ?? "";
  const ctx: RuleCtx = {
    clauseId: input.clauseId,
    clauseText: text,
    lower: text.toLowerCase(),
    category: input.category,
  };

  const findings: RuleFinding[] = [];
  for (const rule of rulesForCategory(input.category)) {
    try {
      const finding = rule(ctx);
      if (finding) findings.push(finding);
    } catch (err) {
      console.error(
        `[risk] rule failed for clause ${input.clauseId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return findings;
}

const RISK_RANK: Record<RuleFinding["level"], number> = {
  high: 4,
  missing: 3,
  medium: 2,
  low: 1,
  standard: 0,
};

// Pick the most severe finding and merge supporting hints from siblings.
export function pickPrimary(findings: readonly RuleFinding[]): RuleFinding | null {
  if (findings.length === 0) return null;
  const sorted = [...findings].sort((a, b) => RISK_RANK[b.level] - RISK_RANK[a.level]);
  return sorted[0];
}

export function aggregateRuleIds(findings: readonly RuleFinding[]): string[] {
  return findings.map((f) => f.ruleId);
}

export function aggregateCitationHints(findings: readonly RuleFinding[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of findings) {
    for (const h of f.citationHints) {
      if (!seen.has(h)) {
        seen.add(h);
        out.push(h);
      }
    }
  }
  return out;
}

export function shouldEscalateToLlm(findings: readonly RuleFinding[]): boolean {
  if (findings.length === 0) return true;
  return findings.some((f) => f.needsLlm);
}
