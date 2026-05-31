import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ContractRecord } from "@/types/ingestion";
import { parsePdf } from "./parse-pdf";
import { parseDocx } from "./parse-docx";
import { normalize } from "./normalize";
import { detectStructure } from "./structure";
import { validateStructure } from "./validate-structure";
import { isSegmentRepairAvailable, repairSegmentation } from "./segment-repair";
import { finalizeContractReady, persistContract } from "./persist";
import { structuredDocumentSchema } from "./schemas";
import {
  classifyClauses,
  persistClassifications,
} from "@/lib/classification";
import { verifyAndPersistCitations } from "@/lib/citations/persist";
import {
  analyzeClauseRisks,
  analyzeDocument,
  isRiskLlmAvailable,
  persistDocumentAnalysis,
  persistRiskAnalyses,
  type DocAnalyzerClause,
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
    let structured = detectStructure(normalized);

    // The deterministic parser is sequence-aware and handles clean documents.
    // When its numbered-clause skeleton looks incoherent (duplicate/scrambled
    // numbering or a collapsed parse), fall back to an LLM segmentation-repair
    // pass. repairSegmentation never throws (returns null on failure), so this
    // degrades gracefully to the deterministic result.
    const validation = validateStructure(structured, normalized);
    let usedRepair = false;
    if (!validation.valid && isSegmentRepairAvailable()) {
      const repaired = await repairSegmentation(normalized);
      if (repaired) {
        const rv = validateStructure(repaired, normalized);
        if (rv.valid || rv.problems.length < validation.problems.length) {
          structured = repaired;
          usedRepair = true;
        }
      }
    }
    const parseValid = usedRepair
      ? validateStructure(structured, normalized).valid
      : validation.valid;

    // Observability: we previously had no signal that the parser had
    // collapsed a 60-page contract into 1 clause. A single line per
    // contract here is enough for an operator to spot the failure mode
    // without spelunking through the DB.
    const clauseCount = structured.sections.reduce(
      (n, s) => n + s.clauses.length,
      0,
    );
    const sectionTitles = structured.sections
      .slice(0, 6)
      .map((s) => `${s.title}(${s.clauses.length})`)
      .join(", ");
    console.warn(
      `[ingestion] contract=${contract.id} mime=${contract.mime_type} chars=${normalized.length} sections=${structured.sections.length} clauses=${clauseCount} parseValid=${parseValid} problems=[${validation.problems.join(",")}] estimated=${validation.estimatedCount} repaired=${usedRepair} firstSections=[${sectionTitles}]`,
    );

    const validated = structuredDocumentSchema.parse(structured);
    await persistContract(client, contract.id, validated, pageCount);

    // Track per-stage health so we can tell a genuinely clean review apart
    // from one that only finalized 'ready' because a downstream failure was
    // swallowed. This drives the analysis_summary the UI uses to show a
    // "partial analysis" warning instead of a misleading "0 high risk".
    const llmAvailable = isRiskLlmAvailable();
    let classificationOk = true;
    let riskOk = false;
    let citationsOk = false;
    let documentOk = false;

    try {
      const { data: rows, error: rowsError } = await client
        .from("clauses")
        .select("id, clause_text, section_title, position")
        .eq("contract_id", contract.id)
        .order("position", { ascending: true });
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
          riskOk = true;
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
          citationsOk = true;
        } catch (citErr) {
          console.error(
            `[citations] non-fatal failure for contract ${contract.id}:`,
            citErr instanceof Error ? citErr.message : citErr,
          );
        }

        // Whole-document pass: missing protections, cross-clause conflicts,
        // one-sided terms, executive summary. This is the Phase-1 capability a
        // clause-by-clause view structurally cannot provide. Non-fatal and
        // additive — failure never blocks finalization.
        try {
          const docClauses: DocAnalyzerClause[] = rows.map((r) => ({
            id: r.id as string,
            position: (r.position as number) ?? 0,
            sectionTitle: (r.section_title as string | null) ?? null,
            text: r.clause_text as string,
          }));
          const docAnalysis = await analyzeDocument({
            contractTitle: contract.title,
            clauses: docClauses,
          });
          documentOk = await persistDocumentAnalysis(
            client,
            contract.id,
            docAnalysis,
          );
        } catch (docErr) {
          console.error(
            `[risk] document analysis non-fatal failure for contract ${contract.id}:`,
            docErr instanceof Error ? docErr.message : docErr,
          );
        }
      }
    } catch (clfErr) {
      classificationOk = false;
      console.error(
        `[classification] non-fatal failure for contract ${contract.id}:`,
        clfErr instanceof Error ? clfErr.message : clfErr,
      );
    }

    // A contract is "partial" when segmentation produced nothing, the risk
    // stage failed entirely, classification failed, or the LLM analyzer was
    // unavailable (rule-only, degraded). We still finalize 'ready' so the
    // parsed document is viewable, but we RECORD the degradation rather than
    // silently presenting a green review.
    const noClauses = clauseCount === 0;
    const degraded =
      noClauses || !parseValid || !classificationOk || !riskOk || !llmAvailable;
    const notes: string[] = [];
    if (noClauses)
      notes.push("No clauses were detected — parsing/segmentation may have failed.");
    if (!noClauses && !parseValid)
      notes.push(
        "Clause segmentation may be imperfect — the numbering looked irregular.",
      );
    if (!classificationOk) notes.push("Clause classification failed.");
    if (!riskOk && !noClauses)
      notes.push("Risk analysis failed — risks may be missing.");
    if (!citationsOk && riskOk) notes.push("Citation verification failed.");
    if (!documentOk && riskOk && llmAvailable)
      notes.push(
        "Whole-document analysis unavailable (missing-clause & cross-clause checks may be incomplete).",
      );
    if (!llmAvailable)
      notes.push("AI analyzer unavailable — rule-only (degraded) review.");

    // Flip to ready only after every downstream stage has had a chance to
    // write its per-clause columns. Downstream failures are now recorded on the
    // error_message column (surfaced as a non-blocking "partial" banner)
    // instead of being silently hidden behind a green review.
    await finalizeContractReady(client, contract.id, {
      errorMessage: degraded ? notes.join(" ") : null,
    });
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
