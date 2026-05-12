import "server-only";
import { isSubstantiveClause } from "@/lib/ingestion/substantive-check";
import {
  analyzeByLlm,
  isRiskLlmAvailable,
  LLM_PARSE_FAILED_MARKER,
  RiskLlmUnavailableError,
} from "./llm-analyzer";
import { getRagContext } from "./rag-context";
import {
  aggregateCitationHints,
  aggregateRuleIds,
  pickPrimary,
  runRules,
  shouldEscalateToLlm,
} from "./rule-engine";
import { shouldAlwaysRunLlm } from "./categories";
import type {
  AnalyzeRiskInput,
  RiskAnalysisResult,
  RiskMethod,
  RuleFinding,
} from "./types";
import type { RiskLevel } from "@/types/contract";
import type { LegalReference } from "@/lib/rag/types";
import type { LlmRiskResponse } from "./schemas";

// Marker pushed onto risk_rule_ids when the substantive check filters a
// clause out. The analysis route uses this to render the clause WITHOUT
// the dev-grade "no specific risk" placeholder — readers see a clean,
// silent paragraph in the document viewer.
export const NON_SUBSTANTIVE_MARKER = "NON_SUBSTANTIVE";

const MIN_TEXT_LENGTH = 40;

export interface AnalyzeRiskOptions {
  concurrency?: number;
  maxLlmCalls?: number;
  signal?: AbortSignal;
}

export async function analyzeClauseRisks(
  inputs: readonly AnalyzeRiskInput[],
  opts: AnalyzeRiskOptions = {},
): Promise<RiskAnalysisResult[]> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const maxLlmCalls = opts.maxLlmCalls ?? readMaxLlmCallsFromEnv();
  const llmEnabled = isRiskLlmAvailable();

  const results: RiskAnalysisResult[] = new Array(inputs.length);
  const llmQueue: { idx: number; input: AnalyzeRiskInput; ruleFindings: RuleFinding[] }[] = [];

  // Pass 1: rule-only synchronous evaluation.
  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];
    const text = input.clauseText ?? "";

    if (text.trim().length < MIN_TEXT_LENGTH) {
      results[i] = standardFallback(input.clauseId, "rule");
      continue;
    }

    // Filter template comments, page markers, attachment markers, bare
    // titles, and very short / mostly-uppercase fragments BEFORE they
    // reach the analyzer. These are the inputs that previously caused
    // the LLM to return prose instead of JSON, surfacing the developer-
    // grade "unparseable response" message to end users.
    if (!isSubstantiveClause(text)) {
      results[i] = nonSubstantiveResult(input.clauseId);
      continue;
    }

    const findings = runRules({
      clauseId: input.clauseId,
      clauseText: text,
      category: input.category,
    });

    const mustEscalate =
      shouldAlwaysRunLlm(input.category) || shouldEscalateToLlm(findings);

    if (!mustEscalate) {
      results[i] = ruleOnlyResult(input.clauseId, findings);
      continue;
    }

    llmQueue.push({ idx: i, input, ruleFindings: findings });
  }

  // Pass 2: LLM analyzer for ambiguous / DPDP / no-rule cases.
  const callable = llmEnabled ? llmQueue.slice(0, maxLlmCalls) : [];
  const skipped = llmEnabled ? llmQueue.slice(maxLlmCalls) : llmQueue;

  await runWithConcurrency(callable, concurrency, async ({ idx, input, ruleFindings }) => {
    results[idx] = await llmFallback(input, ruleFindings, opts.signal);
  });

  for (const { idx, input, ruleFindings } of skipped) {
    results[idx] = ruleOnlyResult(input.clauseId, ruleFindings);
  }

  return results;
}

async function llmFallback(
  input: AnalyzeRiskInput,
  ruleFindings: readonly RuleFinding[],
  signal?: AbortSignal,
): Promise<RiskAnalysisResult> {
  let ragContext: LegalReference[] = [];
  try {
    ragContext = await getRagContext(input.category, input.clauseText);
  } catch {
    ragContext = [];
  }

  try {
    const { response, failedToParse } = await analyzeByLlm(
      {
        clauseId: input.clauseId,
        category: input.category,
        clauseText: input.clauseText,
        ruleFindings,
        ragContext,
      },
      signal ? { signal } : undefined,
    );
    const merged = mergeRuleAndLlm(
      input.clauseId,
      ruleFindings,
      response,
      ragContext.length,
    );
    // When the analyzer hit the soft fallback (exhausted retries / parse
    // failure), tag the row so the admin re-analyze endpoint can find it.
    if (failedToParse) {
      merged.ruleIds = [...merged.ruleIds, LLM_PARSE_FAILED_MARKER];
    }
    return merged;
  } catch (err) {
    if (err instanceof RiskLlmUnavailableError) {
      return ruleOnlyResult(input.clauseId, ruleFindings);
    }
    console.error(
      `[risk] llm analyzer failed for clause ${input.clauseId}:`,
      err instanceof Error ? err.message : err,
    );
    return ruleOnlyResult(input.clauseId, ruleFindings);
  }
}

function mergeRuleAndLlm(
  clauseId: string,
  ruleFindings: readonly RuleFinding[],
  llm: LlmRiskResponse,
  ragHitCount: number,
): RiskAnalysisResult {
  const primary = pickPrimary(ruleFindings);
  const ruleIds = aggregateRuleIds(ruleFindings);
  const citationHints = aggregateCitationHints(ruleFindings);

  const llmAgrees = primary ? primary.level === llm.risk_level : false;
  const method: RiskMethod =
    ruleFindings.length > 0 ? (llmAgrees ? "rule_llm_agree" : "llm") : "llm";

  // Severity wins between rule and LLM unless LLM downgrades a high-rule finding.
  const riskLevel: RiskLevel = primary
    ? higherSeverity(primary.level, llm.risk_level)
    : llm.risk_level;

  const issue = primary && primary.level === riskLevel ? primary.issue : llm.issue;
  const explanation = ensureCitations(llm.explanation, citationHints, riskLevel);
  const suggestion =
    llm.suggestion && llm.suggestion.length > 0
      ? llm.suggestion
      : (primary?.suggestion ?? "");

  const confidence = finalConfidence(
    primary?.confidence ?? null,
    llm.confidence,
    0,
    ragHitCount,
  );

  return {
    clauseId,
    riskLevel,
    issue,
    explanation,
    suggestion,
    confidence,
    method,
    ruleIds,
  };
}

function ruleOnlyResult(
  clauseId: string,
  findings: readonly RuleFinding[],
): RiskAnalysisResult {
  const primary = pickPrimary(findings);
  if (!primary) {
    return standardFallback(clauseId, "rule");
  }
  const allHints = aggregateCitationHints(findings);
  return {
    clauseId,
    riskLevel: primary.level,
    issue: primary.issue,
    explanation: ensureCitations(primary.explanation, allHints, primary.level),
    suggestion: primary.suggestion,
    confidence: round3(primary.confidence),
    method: "rule",
    ruleIds: aggregateRuleIds(findings),
  };
}

function standardFallback(clauseId: string, method: RiskMethod): RiskAnalysisResult {
  return {
    clauseId,
    riskLevel: "standard",
    issue: "No risks detected against current rule set.",
    explanation:
      "Automated analysis did not identify deviations from Indian commercial norms. A reviewer should still confirm clause fit for the transaction.",
    suggestion: "",
    confidence: 0.4,
    method,
    ruleIds: [],
  };
}

// Empty issue/explanation/suggestion strings + NON_SUBSTANTIVE marker tells
// the analysis route to render this clause without a risk callout at all.
function nonSubstantiveResult(clauseId: string): RiskAnalysisResult {
  return {
    clauseId,
    riskLevel: "standard",
    issue: "",
    explanation: "",
    suggestion: "",
    confidence: 1.0,
    method: "rule",
    ruleIds: [NON_SUBSTANTIVE_MARKER],
  };
}

const SEVERITY: Record<RiskLevel, number> = {
  high: 4,
  missing: 3,
  medium: 2,
  low: 1,
  standard: 0,
};

function higherSeverity(a: RiskLevel, b: RiskLevel): RiskLevel {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

function ensureCitations(
  text: string,
  hints: readonly string[],
  riskLevel: RiskLevel,
): string {
  if (riskLevel !== "high" && riskLevel !== "medium") return text;
  if (/\[CITE:[^\]]+\]/i.test(text)) return text;
  if (hints.length === 0) return text;
  const tokens = hints.slice(0, 2).map((h) => `[CITE: ${h}]`).join(" ");
  const trimmed = text.trim().replace(/\.$/, "");
  return `${trimmed}. ${tokens}`;
}

export function finalConfidence(
  ruleConf: number | null,
  llmConf: number | null,
  trustScore: number,
  ragHitCount: number,
): number {
  const base =
    ruleConf != null && llmConf != null
      ? Math.max(ruleConf, llmConf) * 0.6 + Math.min(ruleConf, llmConf) * 0.4
      : (ruleConf ?? llmConf ?? 0.4);
  const ragBoost = Math.min(0.1, ragHitCount * 0.02);
  const trustWeight = 0.7 + 0.3 * Math.min(1, Math.max(0, trustScore));
  const v = (base + ragBoost) * trustWeight;
  return round3(Math.max(0, Math.min(1, v)));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
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

function readMaxLlmCallsFromEnv(): number {
  const raw = process.env.RISK_MAX_LLM_CALLS;
  if (!raw) return 100;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}
