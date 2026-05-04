import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClauseAnalysis, LegalCitation } from "@/types/contract";
import { embedQuery } from "@/lib/rag/embed";
import { extractCitations } from "./extract";
import { verifyOne } from "./verify";
import { applyQualityGate, type GateOutput } from "./gate";
import { logVerification, logPipeline } from "./logger";
import type {
  ExtractedCitation,
  PipelineLogEntry,
  VerificationResult,
  VerifiedAnalysis,
  VerifyLogEntry,
  VerifyOptions,
} from "./types";

export interface VerifyInput {
  clauseId: string;
  clauseText: string;
  // Any LLM-produced text that may contain `[CITE: case|section|year]` tokens.
  // For ClauseAnalysis, pass `reasoning + summary + suggestedRedline`.
  citationCarrier: string;
}

export interface VerifyDeps {
  supabase: SupabaseClient;
  fetchImpl?: typeof fetch;
}

export interface VerifyOutput {
  clauseId: string;
  citations: LegalCitation[];
  trustScore: number;
  results: VerificationResult[];
  pipelineLog: PipelineLogEntry;
  verifyLogs: VerifyLogEntry[];
}

export async function verifyCitationsForClause(
  input: VerifyInput,
  deps: VerifyDeps,
  opts: VerifyOptions = {},
): Promise<VerifyOutput> {
  const start = Date.now();
  const extracted = extractCitations(input.citationCarrier);

  if (extracted.length === 0) {
    const empty = applyQualityGate([]);
    const log = makePipelineLog(input.clauseId, empty, Date.now() - start);
    logPipeline(log);
    return {
      clauseId: input.clauseId,
      citations: empty.citations,
      trustScore: empty.trustScore,
      results: [],
      pipelineLog: log,
      verifyLogs: [],
    };
  }

  const clauseEmbedding = await safeEmbed(input.clauseText);

  const results = await Promise.all(
    extracted.map((c) =>
      verifyOne(
        c,
        {
          supabase: deps.supabase,
          clauseEmbedding,
          fetchImpl: deps.fetchImpl,
        },
        opts,
      ),
    ),
  );

  const gated = applyQualityGate(results);

  const verifyLogs: VerifyLogEntry[] = results.map((r) => ({
    evt: "citation.verify" as const,
    ts: new Date().toISOString(),
    citation_id: r.citation.id,
    raw: r.citation.raw,
    clause_id: input.clauseId,
    sources: {
      local: {
        checked: r.local.checked,
        confirmed: r.local.confirmed,
        latency_ms: r.local.latencyMs,
        relevance: r.local.relevance,
        error: r.local.error,
      },
      kanoon: {
        checked: r.kanoon.checked,
        confirmed: r.kanoon.confirmed,
        latency_ms: r.kanoon.latencyMs,
        error: r.kanoon.error,
        cache_hit: r.kanoon.cacheHit,
      },
    },
    decision: makeDecision(r, gated),
  }));

  for (const entry of verifyLogs) logVerification(entry);

  const log = makePipelineLog(input.clauseId, gated, Date.now() - start);
  logPipeline(log);

  return {
    clauseId: input.clauseId,
    citations: gated.citations,
    trustScore: gated.trustScore,
    results,
    pipelineLog: log,
    verifyLogs,
  };
}

// Convenience wrapper for callers that already have a ClauseAnalysis-shaped object.
export async function verifyClauseAnalysis(
  analysis: ClauseAnalysis,
  clauseText: string,
  deps: VerifyDeps,
  opts: VerifyOptions = {},
): Promise<VerifiedAnalysis> {
  const carrier = [
    analysis.summary ?? "",
    analysis.reasoning ?? "",
    analysis.suggestedRedline ?? "",
  ].join("\n");

  const out = await verifyCitationsForClause(
    {
      clauseId: analysis.id,
      clauseText,
      citationCarrier: carrier,
    },
    deps,
    opts,
  );

  return {
    ...analysis,
    citations: out.citations,
    trustScore: out.trustScore,
    verificationLog: [out.pipelineLog, ...out.verifyLogs],
  };
}

async function safeEmbed(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return await embedQuery(text.slice(0, 8000));
  } catch (err) {
    console.warn(
      "[citations] clause embedding failed; relevance will be neutral:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function makePipelineLog(
  clauseId: string,
  gated: GateOutput,
  ms: number,
): PipelineLogEntry {
  return {
    evt: "citation.pipeline",
    ts: new Date().toISOString(),
    clause_id: clauseId,
    extracted: gated.counts.extracted,
    verified: gated.counts.verified,
    partial: gated.counts.partial,
    dropped: gated.counts.dropped,
    trust_score: gated.trustScore,
    ms,
  };
}

function makeDecision(
  r: VerificationResult,
  gated: GateOutput,
): { status: VerificationResult["status"]; confidence: number; dropped: boolean; flagged: boolean } {
  const kept = gated.citations.find((c) => c.id === r.citation.id);
  return {
    status: r.status,
    confidence: r.confidence,
    dropped: !kept,
    flagged: Boolean(kept?.warning),
  };
}

// Helper for callers / tests.
export { extractCitations } from "./extract";
export { applyQualityGate } from "./gate";
