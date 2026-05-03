import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructuredDocument } from "@/types/ingestion";

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

  const rows = structured.sections.flatMap((section, sectionIndex) =>
    section.clauses.map((clause) => ({
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

  const { error: updateError } = await client
    .from("contracts")
    .update({
      status: "ready",
      structured_json: structured,
      page_count: pageCount,
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", contractId);
  if (updateError) throw new Error(`contract finalize failed: ${updateError.message}`);
}

function extractClauseNumber(text: string): string | null {
  const match = /^(\d+(?:\.\d+)*|\([a-z]{1,3}\)|\([ivx]{1,5}\))\s/i.exec(text);
  return match ? match[1] : null;
}
