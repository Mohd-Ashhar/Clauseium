import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ContractRecord } from "@/types/ingestion";
import { parsePdf } from "./parse-pdf";
import { parseDocx } from "./parse-docx";
import { normalize } from "./normalize";
import { detectStructure } from "./structure";
import { persistContract } from "./persist";
import { structuredDocumentSchema } from "./schemas";

const ERROR_MESSAGE_MAX = 500;

export async function processContract(contract: ContractRecord): Promise<void> {
  const client = createServiceRoleClient();

  try {
    const { data: blob, error: downloadError } = await client.storage
      .from("contracts")
      .download(contract.storage_path);

    if (downloadError || !blob) {
      throw new Error(`storage download failed: ${downloadError?.message ?? "no data"}`);
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    let text: string;
    let pageCount: number;
    let pageTexts: string[] | undefined;

    if (contract.mime_type === "application/pdf") {
      const parsed = await parsePdf(buffer);
      text = parsed.text;
      pageCount = parsed.pageCount;
      pageTexts = parsed.pageTexts;
    } else {
      const parsed = await parseDocx(buffer);
      text = parsed.text;
      pageCount = parsed.pageCount;
    }

    if (!text || text.trim().length === 0) {
      throw new Error("parser produced empty text — file may be scanned or corrupted");
    }

    const normalized = normalize({ text, pageTexts });
    const structured = detectStructure(normalized);

    const validated = structuredDocumentSchema.parse(structured);
    await persistContract(client, contract.id, validated, pageCount);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await client
      .from("contracts")
      .update({
        status: "failed",
        error_message: message.slice(0, ERROR_MESSAGE_MAX),
        processed_at: new Date().toISOString(),
      })
      .eq("id", contract.id);
    throw err;
  }
}
