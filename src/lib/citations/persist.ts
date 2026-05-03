import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassificationResult, ClauseInput } from "@/lib/classification/types";
import { verifyCitationsForClause } from "./pipeline";

const CONCURRENCY = 4;

export interface VerifyAndPersistOptions {
  perCallTimeoutMs?: number;
  signal?: AbortSignal;
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

  let cursor = 0;
  const runners: Promise<void>[] = [];
  const next = async () => {
    while (cursor < clauses.length) {
      const i = cursor++;
      const clause = clauses[i];
      const cls = byId.get(clause.id);
      const carrier = cls?.reasoning ?? "";

      const out = await verifyCitationsForClause(
        {
          clauseId: clause.id,
          clauseText: clause.text,
          citationCarrier: carrier,
        },
        { supabase: client },
        opts,
      );

      const { error } = await client
        .from("clauses")
        .update({
          citations: out.citations,
          trust_score: out.trustScore,
          verification_log: [out.pipelineLog],
          citations_updated_at: new Date().toISOString(),
        })
        .eq("id", clause.id);

      if (error) {
        console.error(
          `[citations] update failed for clause ${clause.id}: ${error.message}`,
        );
      }
    }
  };

  for (let i = 0; i < Math.min(CONCURRENCY, clauses.length); i += 1) {
    runners.push(next());
  }
  await Promise.all(runners);
}
