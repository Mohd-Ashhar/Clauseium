import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructuredDocument } from "@/types/ingestion";

// Persist the parsed structure: write structured_json to the contracts row
// and replace the clauses table for this contract. Status is NOT flipped to
// 'ready' here — the orchestrator does that only after classification, risk
// analysis, and citation verification have all written their per-clause
// columns. Otherwise the result page renders the moment clauses appear and
// shows 0 high/medium because the downstream stages are still mid-flight.
export async function persistContract(
  client: SupabaseClient,
  contractId: string,
  structured: StructuredDocument,
  pageCount: number,
): Promise<void> {
  const { error: deleteError } = await client
    .from("clauses")
    .delete()
    .eq("contract_id", contractId);
  if (deleteError) throw new Error(`clauses delete failed: ${deleteError.message}`);

  // Reuse the parser-assigned clause UUIDs from structured_json so the
  // document pane (which reads structured_json) and the analysis pane (which
  // reads clauses) share the same join key. Without this, structured.id and
  // the DB-generated id diverge and the document pane can't look up risk
  // colour by clause id.
  const rows = structured.sections.flatMap((section, sectionIndex) =>
    section.clauses.map((clause) => ({
      id: clause.id,
      contract_id: contractId,
      section_title: section.title,
      section_position: sectionIndex,
      clause_number: extractClauseNumber(clause.text),
      clause_text: clause.text,
      position: clause.position,
    })),
  );

  if (rows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insertError } = await client.from("clauses").insert(chunk);
      if (insertError) throw new Error(`clauses insert failed: ${insertError.message}`);
    }
  }

  // Persist structured_json + page_count, but leave status as 'processing'
  // until finalizeContractReady() runs at the end of the pipeline.
  const { error: updateError } = await client
    .from("contracts")
    .update({
      structured_json: structured,
      page_count: pageCount,
      error_message: null,
    })
    .eq("id", contractId);
  if (updateError) throw new Error(`contract structure persist failed: ${updateError.message}`);
}

// Flip the contract to 'ready' once the full analysis pipeline has finished.
// Called by the orchestrator after classification + risk + citations have
// written their per-clause columns, so the result page never renders against
// half-populated rows.
export async function finalizeContractReady(
  client: SupabaseClient,
  contractId: string,
): Promise<void> {
  const { error } = await client
    .from("contracts")
    .update({
      status: "ready",
      processed_at: new Date().toISOString(),
    })
    .eq("id", contractId);
  if (error) throw new Error(`contract finalize failed: ${error.message}`);
}

function extractClauseNumber(text: string): string | null {
  const match = /^(\d+(?:\.\d+)*|\([a-z]{1,3}\)|\([ivx]{1,5}\))\s/i.exec(text);
  return match ? match[1] : null;
}
