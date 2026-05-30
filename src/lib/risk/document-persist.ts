import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentAnalysis } from "./document-analyzer";

// Postgres error code for "column does not exist" — thrown when migration 0009
// has not been applied yet. We treat this as non-fatal so the pipeline keeps
// working on older databases (document analysis simply isn't persisted).
const UNDEFINED_COLUMN = "42703";

// Returns false when the column is missing (migration 0009 not applied) so the
// orchestrator can record a clear note instead of marking the stage "ok".
export async function persistDocumentAnalysis(
  client: SupabaseClient,
  contractId: string,
  analysis: DocumentAnalysis,
): Promise<boolean> {
  const { error } = await client
    .from("contracts")
    .update({ document_analysis: analysis })
    .eq("id", contractId);

  if (error) {
    if (error.code === UNDEFINED_COLUMN) {
      console.warn(
        `[risk] document_analysis column missing (run migration 0009); skipping persist for ${contractId}`,
      );
      return false;
    }
    console.error(
      `[risk] failed to persist document analysis for ${contractId}: ${error.message}`,
    );
    return false;
  }
  return true;
}
