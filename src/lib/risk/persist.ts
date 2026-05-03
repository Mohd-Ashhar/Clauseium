import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RiskAnalysisResult } from "./types";

const CONCURRENCY = 4;

export async function persistRiskAnalyses(
  client: SupabaseClient,
  contractId: string,
  results: readonly RiskAnalysisResult[],
): Promise<void> {
  if (results.length === 0) return;

  const analyzedAt = new Date().toISOString();

  let cursor = 0;
  const runners: Promise<void>[] = [];
  const next = async () => {
    while (cursor < results.length) {
      const i = cursor++;
      const r = results[i];
      const { error } = await client
        .from("clauses")
        .update({
          risk_level: r.riskLevel,
          risk_issue: r.issue,
          risk_explanation: r.explanation,
          risk_suggestion: r.suggestion,
          risk_confidence: r.confidence,
          risk_method: r.method,
          risk_rule_ids: r.ruleIds,
          risk_analyzed_at: analyzedAt,
        })
        .eq("id", r.clauseId)
        .eq("contract_id", contractId);

      if (error) {
        console.error(
          `[risk] update failed for clause ${r.clauseId}: ${error.message}`,
        );
      }
    }
  };

  for (let i = 0; i < Math.min(CONCURRENCY, results.length); i += 1) {
    runners.push(next());
  }
  await Promise.all(runners);
}

// Recompute and write the final risk_confidence after citation verification has
// produced a trust_score for each clause. Called from verifyAndPersistCitations.
export async function finalizeRiskConfidence(
  client: SupabaseClient,
  contractId: string,
  clauseId: string,
  newConfidence: number,
): Promise<void> {
  const { error } = await client
    .from("clauses")
    .update({ risk_confidence: newConfidence })
    .eq("id", clauseId)
    .eq("contract_id", contractId);

  if (error) {
    console.error(
      `[risk] finalize confidence failed for clause ${clauseId}: ${error.message}`,
    );
  }
}
