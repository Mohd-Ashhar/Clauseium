import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassificationResult, ClauseInput } from "@/lib/classification/types";
import { verifyCitationsForClause } from "./pipeline";
import {
  finalConfidence,
  finalizeRiskConfidence,
  type RiskAnalysisResult,
} from "@/lib/risk";

const CONCURRENCY = 4;

export interface VerifyAndPersistOptions {
  perCallTimeoutMs?: number;
  signal?: AbortSignal;
  riskByClauseId?: Map<string, RiskAnalysisResult>;
}

export async function verifyAndPersistCitations(
  client: SupabaseClient,
  clauses: readonly ClauseInput[],
  classifications: readonly ClassificationResult[],
  opts: VerifyAndPersistOptions = {},
): Promise<void> {
  if (clauses.length === 0) return;

  const byId = new Map<string, ClassificationResult>();
  for (const c of classifications) byId.set(c.clauseId, c);

  const riskById = opts.riskByClauseId;

  let cursor = 0;
  let contractIdRef: string | null = null;
  const runners: Promise<void>[] = [];
  const next = async () => {
    while (cursor < clauses.length) {
      const i = cursor++;
      const clause = clauses[i];
      const cls = byId.get(clause.id);
      const risk = riskById?.get(clause.id);
      const carrier = buildCarrier(cls?.reasoning ?? "", risk);

      const out = await verifyCitationsForClause(
        {
          clauseId: clause.id,
          clauseText: clause.text,
          citationCarrier: carrier,
        },
        { supabase: client },
        { perCallTimeoutMs: opts.perCallTimeoutMs, signal: opts.signal },
      );

      const { data, error } = await client
        .from("clauses")
        .update({
          citations: out.citations,
          trust_score: out.trustScore,
          verification_log: [out.pipelineLog, ...out.verifyLogs],
          citations_updated_at: new Date().toISOString(),
        })
        .eq("id", clause.id)
        .select("contract_id")
        .maybeSingle();

      if (error) {
        console.error(
          `[citations] update failed for clause ${clause.id}: ${error.message}`,
        );
        continue;
      }
      if (data?.contract_id) contractIdRef = data.contract_id as string;

      if (risk && contractIdRef) {
        // Decompose the persisted risk confidence back into rule/llm slots
        // based on which path produced it, so finalConfidence applies the
        // trust-score weighting to the correct branch of its formula.
        const ruleConf = risk.method === "rule" ? risk.confidence : null;
        const llmConf = risk.method === "rule" ? null : risk.confidence;
        const updated = finalConfidence(
          ruleConf,
          llmConf,
          out.trustScore,
          0,
        );
        await finalizeRiskConfidence(client, contractIdRef, clause.id, updated);
      }
    }
  };

  for (let i = 0; i < Math.min(CONCURRENCY, clauses.length); i += 1) {
    runners.push(next());
  }
  await Promise.all(runners);
}

function buildCarrier(
  classificationReasoning: string,
  risk: RiskAnalysisResult | undefined,
): string {
  if (!risk) return classificationReasoning;
  return [
    classificationReasoning,
    risk.issue,
    risk.explanation,
    risk.suggestion,
  ]
    .filter((s) => typeof s === "string" && s.length > 0)
    .join("\n");
}
