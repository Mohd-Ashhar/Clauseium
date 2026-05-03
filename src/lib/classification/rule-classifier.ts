import { CLASSIFICATION_CATEGORIES, type ClassificationCategory } from "./categories";
import { ANCHOR_WEIGHTS, RULES, type ClauseRule } from "./rules";

export interface RuleScore {
  category: ClassificationCategory;
  score: number;
  matchedRules: string[];
}

export interface RuleClassification {
  top: RuleScore | null;
  runnerUp: RuleScore | null;
  allScores: RuleScore[];
  needsLlm: boolean;
}

export const DEFAULT_THRESHOLD = 0.8;
const TIE_MARGIN = 0.15;

export function classifyByRules(
  rawText: string,
  threshold: number = DEFAULT_THRESHOLD,
): RuleClassification {
  const text = normalize(rawText);

  const scores = new Map<ClassificationCategory, RuleScore>();
  for (const cat of CLASSIFICATION_CATEGORIES) {
    scores.set(cat, { category: cat, score: 0, matchedRules: [] });
  }

  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    const bucket = scores.get(rule.category)!;
    bucket.score = Math.min(1, bucket.score + ANCHOR_WEIGHTS[rule.anchor]);
    bucket.matchedRules.push(rule.id);
  }

  const allScores = [...scores.values()]
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = allScores[0] ?? null;
  const runnerUp = allScores[1] ?? null;

  const needsLlm = computeNeedsLlm(top, runnerUp, threshold);

  return { top, runnerUp, allScores, needsLlm };
}

function computeNeedsLlm(
  top: RuleScore | null,
  runnerUp: RuleScore | null,
  threshold: number,
): boolean {
  if (!top) return true;
  if (top.score < threshold) return true;
  if (runnerUp && top.score - runnerUp.score < TIE_MARGIN) return true;
  return false;
}

export function dominantRuleId(top: RuleScore | null): string | null {
  if (!top || top.matchedRules.length === 0) return null;
  return top.matchedRules[0];
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function _testRules(): readonly ClauseRule[] {
  return RULES;
}
