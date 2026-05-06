import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ContractRecord } from "@/types/ingestion";
import { parsePdf } from "./parse-pdf";
import { parseDocx } from "./parse-docx";
import { normalize } from "./normalize";
import { detectStructure } from "./structure";
import { finalizeContractReady, persistContract } from "./persist";
import { structuredDocumentSchema } from "./schemas";
import {
  classifyClauses,
  persistClassifications,
} from "@/lib/classification";
import { verifyAndPersistCitations } from "@/lib/citations/persist";
import {
  analyzeClauseRisks,
  persistRiskAnalyses,
  type RiskAnalysisResult,
} from "@/lib/risk";

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

    try {
      const { data: rows, error: rowsError } = await client
        .from("clauses")
        .select("id, clause_text")
        .eq("contract_id", contract.id);
      if (rowsError) throw rowsError;
      if (rows && rows.length > 0) {
        const clauseInputs = rows.map((r) => ({
          id: r.id as string,
          text: r.clause_text as string,
        }));
        const results = await classifyClauses(clauseInputs);
        await persistClassifications(client, contract.id, results, randomUUID());

        let riskByClauseId: Map<string, RiskAnalysisResult> | undefined;
        try {
          const riskInputs = clauseInputs.map((c) => {
            const cls = results.find((r) => r.clauseId === c.id);
            return {
              clauseId: c.id,
              clauseText: c.text,
              category: cls?.category ?? "other",
              classificationConfidence: cls?.confidence ?? 0,
            };
          });
          const riskResults = await analyzeClauseRisks(riskInputs);
          await persistRiskAnalyses(client, contract.id, riskResults);
          riskByClauseId = new Map(riskResults.map((r) => [r.clauseId, r]));
        } catch (riskErr) {
          console.error(
            `[risk] non-fatal failure for contract ${contract.id}:`,
            riskErr instanceof Error ? riskErr.message : riskErr,
          );
        }

        try {
          await verifyAndPersistCitations(client, clauseInputs, results, {
            riskByClauseId,
          });
        } catch (citErr) {
          console.error(
            `[citations] non-fatal failure for contract ${contract.id}:`,
            citErr instanceof Error ? citErr.message : citErr,
          );
        }
      }
    } catch (clfErr) {
      console.error(
        `[classification] non-fatal failure for contract ${contract.id}:`,
        clfErr instanceof Error ? clfErr.message : clfErr,
      );
    }

    // Flip to ready only after every downstream stage has had a chance to
    // write its per-clause columns. Until this point the contract has been
    // sitting in 'processing'. Downstream failures are caught and logged
    // above so they never prevent finalization.
    await finalizeContractReady(client, contract.id);
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
