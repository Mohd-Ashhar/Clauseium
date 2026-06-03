import "server-only";
import {
  classifyByLlm,
  isLlmAvailable,
  LlmUnavailableError,
} from "./llm-classifier";
import {
  classifyByRules,
  DEFAULT_THRESHOLD,
  dominantRuleId,
  type RuleClassification,
} from "./rule-classifier";
import { groupByKey, normalizeForKey } from "@/lib/ai/dedupe";
import type { ClassificationResult, ClauseInput } from "./types";

const MIN_TEXT_LENGTH = 40;

export interface ClassifyOptions {
  threshold?: number;
  concurrency?: number;
  maxLlmCalls?: number;
}

export async function classifyClauses(
  clauses: readonly ClauseInput[],
  opts: ClassifyOptions = {},
): Promise<ClassificationResult[]> {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const maxLlmCalls = opts.maxLlmCalls ?? readMaxLlmCallsFromEnv();

  const llmEnabled = isLlmAvailable();
  const results: ClassificationResult[] = new Array(clauses.length);
  const llmQueue: { idx: number; clause: ClauseInput; ctx: RuleClassification }[] = [];

  // Pass 1: rule classification for all clauses.
  for (let i = 0; i < clauses.length; i += 1) {
    const clause = clauses[i];
    const text = clause.text ?? "";

    if (text.trim().length < MIN_TEXT_LENGTH) {
      results[i] = makeOtherFallback(clause.id, "rule", null, "clause too short");
      continue;
    }

    const ctx = classifyByRules(text, threshold);

    if (!ctx.needsLlm && ctx.top) {
      results[i] = {
        clauseId: clause.id,
        category: ctx.top.category,
        confidence: roundConf(ctx.top.score),
        method: "rule",
        matchedRule: dominantRuleId(ctx.top),
        model: null,
        reasoning: null,
      };
      continue;
    }

    llmQueue.push({ idx: i, clause, ctx });
  }

  // Pass 2: LLM fallback for low-confidence or ambiguous clauses.
  if (!llmEnabled) {
    for (const { idx, clause, ctx } of llmQueue) {
      results[idx] = ruleOnlyFallback(clause.id, ctx);
    }
    return results;
  }

  // Dedup by normalized clause text so identical clauses are classified once.
  // Grouping before the budget slice means maxLlmCalls counts unique clauses.
  const groups = groupByKey(llmQueue, (q) => normalizeForKey(q.clause.text));
  const callableGroups = groups.slice(0, maxLlmCalls);
  const skippedGroups = groups.slice(maxLlmCalls);

  await runWithConcurrency(callableGroups, concurrency, async (group) => {
    const rep = group[0];
    const result = await llmFallback(rep.clause, rep.ctx);
    for (const member of group) {
      results[member.idx] =
        member === rep ? result : { ...result, clauseId: member.clause.id };
    }
  });

  for (const group of skippedGroups) {
    for (const { idx, clause, ctx } of group) {
      results[idx] = ruleOnlyFallback(clause.id, ctx);
    }
  }

  return results;
}

async function llmFallback(
  clause: ClauseInput,
  ctx: RuleClassification,
): Promise<ClassificationResult> {
  try {
    const { response, model } = await classifyByLlm(clause.text, ctx);

    if (ctx.top && response.category === ctx.top.category) {
      const conf = roundConf(Math.max(ctx.top.score, response.confidence, 0.85));
      return {
        clauseId: clause.id,
        category: response.category,
        confidence: conf,
        method: "rule_llm_agree",
        matchedRule: dominantRuleId(ctx.top),
        model,
        reasoning: response.reasoning || null,
      };
    }

    if (response.category === "other") {
      return {
        clauseId: clause.id,
        category: "other",
        confidence: roundConf(Math.min(response.confidence, 0.5)),
        method: "llm",
        matchedRule: null,
        model,
        reasoning: response.reasoning || null,
      };
    }

    return {
      clauseId: clause.id,
      category: response.category,
      confidence: roundConf(response.confidence),
      method: "llm",
      matchedRule: null,
      model,
      reasoning: response.reasoning || null,
    };
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      return ruleOnlyFallback(clause.id, ctx);
    }
    console.error("[classification] llm call failed", err);
    return ruleOnlyFallback(clause.id, ctx);
  }
}

function ruleOnlyFallback(
  clauseId: string,
  ctx: RuleClassification,
): ClassificationResult {
  if (ctx.top) {
    return {
      clauseId,
      category: ctx.top.category,
      confidence: roundConf(Math.min(ctx.top.score, 0.5)),
      method: "rule",
      matchedRule: dominantRuleId(ctx.top),
      model: null,
      reasoning: null,
    };
  }
  return makeOtherFallback(clauseId, "rule", null, "no rule match");
}

function makeOtherFallback(
  clauseId: string,
  method: ClassificationResult["method"],
  model: string | null,
  reasoning: string,
): ClassificationResult {
  return {
    clauseId,
    category: "other",
    confidence: 0.3,
    method,
    matchedRule: null,
    model,
    reasoning,
  };
}

async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const runners: Promise<void>[] = [];
  const next = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i]);
    }
  };
  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    runners.push(next());
  }
  await Promise.all(runners);
}

function roundConf(n: number): number {
  return Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
}

function readMaxLlmCallsFromEnv(): number {
  const raw = process.env.CLASSIFICATION_MAX_LLM_CALLS;
  if (!raw) return 100;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}
