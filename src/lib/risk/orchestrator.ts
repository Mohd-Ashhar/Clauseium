import "server-only";
import { isSubstantiveClause } from "@/lib/ingestion/substantive-check";
import {
  analyzeByLlm,
  isRiskLlmAvailable,
  type LlmAnalyzeInput,
  type LlmAnalyzeResult,
  LLM_PARSE_FAILED_MARKER,
  pickRiskModel,
  RISK_MODEL_DEFAULT,
  RISK_MODEL_ESCALATION,
  RiskLlmUnavailableError,
} from "./llm-analyzer";
import { getRagContext } from "./rag-context";
import { groupByKey, normalizeForKey } from "@/lib/ai/dedupe";
import {
  type CachedRisk,
  type RiskCache,
  isCacheable,
  riskCacheKey,
} from "./cache";
import { isBatchEnabled, runRiskBatch } from "./batch";
import {
  aggregateCitationHints,
  aggregateRuleIds,
  pickPrimary,
  runRules,
} from "./rule-engine";
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
  // Called after each LLM-analyzed clause completes. The ingestion orchestrator
  // wires this to a throttled DB heartbeat so a long risk fan-out keeps the
  // contract marked "alive" and the status-route reclaim never fires mid-run
  // (which would re-bill the whole document).
  onProgress?: (done: number, total: number) => void;
  // Optional cross-contract analysis cache. When provided, an identical clause
  // (text+category, same analyzer version) analyzed for a prior contract is
  // reused instead of re-billed. Omit it (e.g. in tests/eval) for the
  // uncached path — behaviour is otherwise identical.
  cache?: RiskCache;
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

    // Every substantive clause gets a model pass. Rule findings are passed to
    // the analyzer as priors and merged with its output. Previously the LLM
    // was gated behind rule hits / a tiny always-run set, which was a major
    // recall leak: clauses with no matching rule (warranties, confidentiality,
    // auto-renewal, insurance, and everything in the 'other' bucket) were
    // silently marked "standard / no risks". The rule-only path now only
    // applies when the LLM is unavailable or the per-contract LLM budget is
    // exhausted (handled in Pass 2).
    llmQueue.push({ idx: i, input, ruleFindings: findings });
  }

  // Pass 2: LLM analyzer for ambiguous / DPDP / no-rule cases.
  if (!llmEnabled) {
    for (const { idx, input, ruleFindings } of llmQueue) {
      results[idx] = ruleOnlyResult(input.clauseId, ruleFindings);
    }
    return results;
  }

  // Dedup by (normalized clause text + category) so identical boilerplate is
  // analyzed once. Grouping BEFORE the budget slice means maxLlmCalls counts
  // UNIQUE clauses — boilerplate-heavy documents get more real coverage per
  // dollar, not less.
  const groups = groupByKey(
    llmQueue,
    (q) => `${normalizeForKey(q.input.clauseText)}|${q.input.category}`,
  );
  const callableGroups = groups.slice(0, maxLlmCalls);
  const skippedGroups = groups.slice(maxLlmCalls);

  // Cross-contract cache layer: a hit reuses a prior identical-clause analysis
  // (no LLM call); misses fall through to the analyzer and are written back.
  const cache = opts.cache;
  const groupKeys = callableGroups.map((g) =>
    riskCacheKey(g[0].input.clauseText, g[0].input.category),
  );
  const cached = cache
    ? await cache.get(groupKeys)
    : new Map<string, CachedRisk>();

  type Group = (typeof callableGroups)[number];
  const misses: { group: Group; key: string }[] = [];
  callableGroups.forEach((group, gi) => {
    const key = groupKeys[gi];
    const hit = cached.get(key);
    if (hit) {
      for (const member of group) {
        results[member.idx] = { ...hit, clauseId: member.input.clauseId };
      }
    } else {
      misses.push({ group, key });
    }
  });

  const toCache: { key: string; result: RiskAnalysisResult }[] = [];
  const applyResult = (group: Group, key: string, result: RiskAnalysisResult) => {
    const rep = group[0];
    for (const member of group) {
      results[member.idx] =
        member === rep ? result : { ...result, clauseId: member.input.clauseId };
    }
    if (cache && isCacheable(result)) toCache.push({ key, result });
  };

  // With RISK_USE_BATCH=1, the Batch API analyzes the misses first (~50%
  // cheaper, same model/prompt/output). Anything it can't deliver — timeout,
  // error, or an unparsed response — falls through to the real-time analyzer
  // below, so no clause is ever lost. Default off → this block is skipped and
  // the path is byte-identical to real-time.
  let pending = misses;
  if (isBatchEnabled() && pending.length > 0) {
    const handled = new Set<string>();
    const prepared = await Promise.all(
      pending.map(async (m) => {
        const rep = m.group[0];
        let ragContext: LegalReference[] = [];
        try {
          ragContext = await getRagContext(rep.input.category, rep.input.clauseText);
        } catch {
          ragContext = [];
        }
        const llmInput: LlmAnalyzeInput = {
          clauseId: rep.input.clauseId,
          category: rep.input.category,
          clauseText: rep.input.clauseText,
          ruleFindings: rep.ruleFindings,
          ragContext,
          classificationConfidence: rep.input.classificationConfidence,
        };
        return { miss: m, ragContext, llmInput };
      }),
    );
    const outcomes = await runRiskBatch(
      prepared.map((p) => ({ customId: p.miss.key, input: p.llmInput })),
      {
        ...(opts.signal ? { signal: opts.signal } : {}),
        // Keep the contract's heartbeat fresh during the (long) batch poll so
        // the status-route reclaim never fires mid-batch.
        onPoll: () => opts.onProgress?.(0, prepared.length),
      },
    );
    for (const p of prepared) {
      const bo = outcomes.get(p.miss.key);
      if (!bo) continue;
      const rep = p.miss.group[0];
      const merged = mergeRuleAndLlm(
        rep.input.clauseId,
        rep.ruleFindings,
        bo.response,
        p.ragContext.length,
        rep.input.clauseText,
      );
      applyResult(p.miss.group, p.miss.key, merged);
      handled.add(p.miss.key);
    }
    pending = pending.filter((m) => !handled.has(m.key));
  }

  let done = 0;
  await runWithConcurrency(pending, concurrency, async ({ group, key }) => {
    const rep = group[0];
    const result = await llmFallback(rep.input, rep.ruleFindings, opts.signal);
    applyResult(group, key, result);
    done += 1;
    opts.onProgress?.(done, pending.length);
  });

  if (cache && toCache.length > 0) {
    // A cache write must never block or fail the analysis.
    try {
      await cache.set(toCache);
    } catch {
      /* best-effort */
    }
  }

  for (const group of skippedGroups) {
    for (const { idx, input, ruleFindings } of group) {
      results[idx] = ruleOnlyResult(input.clauseId, ruleFindings);
    }
  }

  return results;
}

async function llmFallback(
  input: AnalyzeRiskInput,
  ruleFindings: readonly RuleFinding[],
  signal?: AbortSignal,
): Promise<RiskAnalysisResult> {
  // RAG context is fetched ONCE and reused across both cascade passes — the
  // cheap pass and any escalation see the same grounding, at no extra
  // embedding/search cost.
  let ragContext: LegalReference[] = [];
  try {
    ragContext = await getRagContext(input.category, input.clauseText);
  } catch {
    ragContext = [];
  }

  const llmInput: LlmAnalyzeInput = {
    clauseId: input.clauseId,
    category: input.category,
    clauseText: input.clauseText,
    ruleFindings,
    ragContext,
    classificationConfidence: input.classificationConfidence,
  };

  try {
    const { response, failedToParse } = await analyzeWithCascade(
      llmInput,
      ruleFindings,
      signal,
    );
    const merged = mergeRuleAndLlm(
      input.clauseId,
      ruleFindings,
      response,
      ragContext.length,
      input.clauseText,
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

// Cost-saving model cascade (recall-preserving). Clauses that pickRiskModel would
// route to the cheaper default model run once, unchanged. Clauses it would send
// straight to the expensive escalation model (high-stakes category, a high
// rule-hit, or low classification confidence) instead get a CHEAP first pass and
// are escalated to the strong model ONLY when that pass surfaces risk or
// uncertainty — so the strong model is still spent on every clause that needs it,
// but not on high-stakes clauses that are confidently clean.
async function analyzeWithCascade(
  llmInput: LlmAnalyzeInput,
  ruleFindings: readonly RuleFinding[],
  signal?: AbortSignal,
): Promise<{ response: LlmRiskResponse; failedToParse?: boolean }> {
  const base = signal ? { signal } : {};
  const target = pickRiskModel(
    llmInput.category,
    ruleFindings,
    llmInput.classificationConfidence,
  );

  // Not escalation-eligible, or cascade disabled → single pass with the model
  // pickRiskModel chose (unchanged behaviour).
  if (!cascadeEnabled() || target !== RISK_MODEL_ESCALATION) {
    const r = await analyzeByLlm(llmInput, { ...base, model: target });
    return { response: r.response, failedToParse: r.failedToParse };
  }

  // Escalation-eligible: cheap pass first.
  const cheap = await analyzeByLlm(llmInput, { ...base, model: RISK_MODEL_DEFAULT });
  if (!shouldEscalate(cheap, ruleFindings)) {
    return { response: cheap.response, failedToParse: cheap.failedToParse };
  }
  // Risky or uncertain → spend the strong model (same RAG context).
  const strong = await analyzeByLlm(llmInput, {
    ...base,
    model: RISK_MODEL_ESCALATION,
  });
  return { response: strong.response, failedToParse: strong.failedToParse };
}

// Escalate to the strong model when the cheap pass is anything other than a
// confident "this clause is fine": any non-trivial risk level, low confidence, a
// deterministic high rule-hit, or a parse failure. Biased toward escalation so
// recall is preserved — only a confidently-standard/low clause skips the strong
// model.
function shouldEscalate(
  cheap: LlmAnalyzeResult,
  ruleFindings: readonly RuleFinding[],
): boolean {
  if (cheap.failedToParse) return true;
  const level = cheap.response.risk_level;
  if (level === "high" || level === "medium" || level === "missing") return true;
  if (cheap.response.confidence < escalateBelowConfidence()) return true;
  if (ruleFindings.some((f) => f.level === "high")) return true;
  return false;
}

function cascadeEnabled(): boolean {
  const raw = process.env.RISK_CASCADE;
  // Default ON. Any of 0/false/off (case-insensitive) disables it.
  return raw == null ? true : !/^(0|false|off)$/i.test(raw.trim());
}

function escalateBelowConfidence(): number {
  const raw = process.env.RISK_CASCADE_ESCALATE_CONFIDENCE;
  const n = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.75;
}

function mergeRuleAndLlm(
  clauseId: string,
  ruleFindings: readonly RuleFinding[],
  llm: LlmRiskResponse,
  ragHitCount: number,
  clauseText: string,
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
  const suggestion = pickSuggestion(llm.suggestion, primary, clauseText);

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

// Choose the redline to surface. The per-clause LLM suggestion is always
// preferred — it is written against the actual clause. Rule suggestions are
// generic templates keyed to a detected pattern (e.g. "no notice period"), so
// when the LLM produced no redline AND the rule template's topic is absent from
// the clause, applying it would leak an irrelevant redline onto an unrelated
// clause (the P1-1 bug: the same "thirty (30) days' notice" text appearing on
// Confidentiality, Severability, Survival…). In that case we suppress it
// entirely rather than mislead the reviewer. NOTE: the rule-only degraded path
// (ruleOnlyResult, used when the LLM is unavailable) is intentionally left
// unguarded — there the whole document is rule-only.
function pickSuggestion(
  llmSuggestion: string,
  primary: RuleFinding | null,
  clauseText: string,
): string {
  if (llmSuggestion && llmSuggestion.length > 0) return llmSuggestion;
  if (!primary || !primary.suggestion) return "";
  return ruleSuggestionFitsClause(primary.ruleId, clauseText)
    ? primary.suggestion
    : "";
}

function ruleSuggestionFitsClause(ruleId: string, clauseText: string): boolean {
  const anchors = anchorsForRule(ruleId);
  if (anchors.length === 0) return true; // unknown family → don't over-suppress
  const text = clauseText.toLowerCase();
  return anchors.some((a) => a.test(text));
}

// Topic anchors per rule family, mirroring each rule pack's own vocabulary. A
// template "fits" only if the clause mentions at least one anchor for its
// family. Errs toward keeping (returns [] → keep) for unrecognised families.
function anchorsForRule(ruleId: string): RegExp[] {
  if (ruleId.startsWith("term."))
    return [/terminat/, /\bnotice\b/, /\bcure\b/, /surviv/, /expir/, /renew/];
  if (ruleId.startsWith("indem."))
    return [/indemnif/, /hold harmless/, /\bdefend\b/, /infring/];
  if (ruleId.startsWith("pay."))
    return [
      /\bpay(?:ment|able|s)?\b/,
      /invoice/,
      /\bfee(?:s)?\b/,
      /\bdue\b/,
      /\bgst\b/,
      /\btds\b/,
      /\btax/,
      /currency|remit|fema/,
      /msme/,
    ];
  if (ruleId.startsWith("lol."))
    return [/liabilit/, /\bliable\b/, /\bcap(?:ped|s)?\b/, /damages/, /consequential/];
  if (ruleId.startsWith("ip."))
    return [
      /intellectual property/,
      /copyright/,
      /\bip\b/,
      /work[ -]for[ -]hire/,
      /moral right/,
      /deliverable/,
      /invention/,
      /proprietary/,
    ];
  if (ruleId.startsWith("dpdp."))
    return [/\bdata\b/, /personal data/, /privacy/, /consent/, /\bbreach\b/, /process/];
  if (ruleId.startsWith("gl."))
    return [/governing law/, /\bgovern/, /construed/, /laws of/];
  if (ruleId.startsWith("juris."))
    return [/jurisdiction/, /\bcourt/, /arbitrat/, /\bforum\b/];
  return [];
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
