import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassificationResult } from "./types";

const CHUNK_SIZE = 500;

export async function persistClassifications(
  client: SupabaseClient,
  contractId: string,
  results: readonly ClassificationResult[],
  runId: string,
): Promise<void> {
  if (results.length === 0) return;

  const rows = results.map((r) => ({
    clause_id: r.clauseId,
    contract_id: contractId,
    run_id: runId,
    category: r.category,
    confidence: r.confidence,
    method: r.method,
    matched_rule: r.matchedRule,
    model: r.model,
    reasoning: r.reasoning,
  }));

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await client.from("clause_classifications").insert(chunk);
    if (error) {
      throw new Error(`clause_classifications insert failed: ${error.message}`);
    }
  }
}
