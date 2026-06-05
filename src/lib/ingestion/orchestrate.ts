import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import type { ClassificationResult } from "@/lib/classification";
import { verifyAndPersistCitations } from "@/lib/citations/persist";
import {
  analyzeClauseRisks,
  analyzeDocument,
  createRiskCache,
  isRiskLlmAvailable,
  persistDocumentAnalysis,
  persistRiskAnalyses,
  type DocAnalyzerClause,
  type RiskAnalysisResult,
} from "@/lib/risk";

const ERROR_MESSAGE_MAX = 500;

// Below this many clauses, a contract is eligible for the whole-document cost
// gate (skip the LLM doc pass when it's also clean). Override with
// DOC_ANALYSIS_MIN_CLAUSES.
const DOC_ANALYSIS_MIN_CLAUSES_DEFAULT = 8;
function readDocAnalysisMinClauses(): number {
  const raw = process.env.DOC_ANALYSIS_MIN_CLAUSES;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : DOC_ANALYSIS_MIN_CLAUSES_DEFAULT;
}

// Postgres "column does not exist" — the heartbeat columns (migration 0011) and
// document_analysis (0009) are treated as best-effort so an un-migrated DB keeps
// working.
const UNDEFINED_COLUMN = "42703";

// Don't write a DB heartbeat more often than this during the risk fan-out.
const HEARTBEAT_MIN_MS = 15_000;

interface ClauseRow {
  id: string;
  clause_text: string;
  section_title: string | null;
  position: number;
  risk_analyzed_at: string | null;
}

export async function processContract(contract: ContractRecord): Promise<void> {
  const client = createServiceRoleClient();

  try {
    // Mark when THIS processing attempt began + an initial heartbeat. The
    // status-route reclaim measures staleness from these (not uploaded_at), so a
    // healthy long run is never reclaimed and re-billed. Best-effort: tolerated
    // on databases that haven't run migration 0011 yet.
    await stampProcessingStart(client, contract.id);

    // ── Stage 0: parse + persist — SKIPPED on a resume ──────────────────────
    // A prior (killed/reclaimed) run already parsed and persisted the clauses;
    // re-parsing would `delete` them (persistContract wipes the table) and throw
    // away every risk_analyzed_at, forcing a full re-analysis. structured_json is
    // written only after all clauses are inserted, so its presence + existing
    // clause rows is a reliable "parse already done" signal.
    let parseValid = true;
    if (!(await isAlreadyParsed(client, contract.id))) {
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
      parseValid = usedRepair
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
    } else {
      console.warn(`[ingestion] contract=${contract.id} resuming — clauses already parsed, skipping parse/persist`);
    }

    // Load the persisted clauses with their per-clause risk state. This is the
    // join key for every resume decision below.
    const clauseRows = await loadClauseRows(client, contract.id);
    const clauseCount = clauseRows.length;

    // Track per-stage health so we can tell a genuinely clean review apart
    // from one that only finalized 'ready' because a downstream failure was
    // swallowed. This drives the analysis_summary the UI uses to show a
    // "partial analysis" warning instead of a misleading "0 high risk".
    const llmAvailable = isRiskLlmAvailable();
    let classificationOk = true;
    let riskOk = false;
    let citationsOk = false;
    let documentOk = false;

    if (clauseCount > 0) {
      try {
        const clauseInputs = clauseRows.map((r) => ({
          id: r.id,
          text: r.clause_text,
        }));

        // ── Stage 1: classification ──────────────────────────────────────────
        // Always re-run: it is rule-first and uses only the cheap Haiku model for
        // the few low-confidence clauses, so re-classifying on a resume costs
        // cents — and it gives us a clean category for every clause to feed the
        // (expensive) risk stage and citations.
        const classifications = await classifyClauses(clauseInputs);
        await persistClassifications(client, contract.id, classifications, randomUUID());
        await touchHeartbeat(client, contract.id);

        // ── Stage 2: risk — ONLY clauses not yet analyzed ────────────────────
        // This is the big cost lever: on a reclaim, clauses already carrying a
        // risk_analyzed_at are skipped, so the expensive Sonnet/Opus fan-out is
        // never paid for twice. A throttled heartbeat keeps the run "alive" so
        // the status-route reclaim doesn't spawn a concurrent duplicate run.
        const unrisked = clauseRows.filter((r) => r.risk_analyzed_at == null);
        let riskByClauseId: Map<string, RiskAnalysisResult> | undefined;
        try {
          if (unrisked.length > 0) {
            const byId = new Map(classifications.map((c) => [c.clauseId, c]));
            const riskInputs = unrisked.map((r) => {
              const cls = byId.get(r.id);
              return {
                clauseId: r.id,
                clauseText: r.clause_text,
                category: cls?.category ?? "other",
                classificationConfidence: cls?.confidence ?? 0,
              };
            });
            const heartbeat = makeThrottledHeartbeat(client, contract.id);
            const riskResults = await analyzeClauseRisks(riskInputs, {
              contractId: contract.id,
              onProgress: () => heartbeat(),
              // Cross-contract cache (migration 0012). Default on; set
              // RISK_CACHE=0 to disable. Migration-tolerant: a missing table
              // degrades to no caching.
              cache:
                process.env.RISK_CACHE === "0"
                  ? undefined
                  : createRiskCache(client),
            });
            await persistRiskAnalyses(client, contract.id, riskResults);
            riskByClauseId = new Map(riskResults.map((r) => [r.clauseId, r]));
          }
          riskOk = true;
        } catch (riskErr) {
          console.error(
            `[risk] non-fatal failure for contract ${contract.id}:`,
            riskErr instanceof Error ? riskErr.message : riskErr,
          );
        }
        await touchHeartbeat(client, contract.id);

        // ── Stage 3: citations — only the freshly-analyzed clauses ───────────
        // Citation verification doesn't call Claude (corpus + embeddings), so
        // scoping it to fresh clauses is purely to avoid redundant work.
        try {
          if (unrisked.length > 0) {
            const freshInputs = unrisked.map((r) => ({ id: r.id, text: r.clause_text }));
            const freshIds = new Set(unrisked.map((r) => r.id));
            const freshClassifications = classifications.filter((c) =>
              freshIds.has(c.clauseId),
            );
            await verifyAndPersistCitations(client, freshInputs, freshClassifications, {
              riskByClauseId,
            });
          }
          citationsOk = true;
        } catch (citErr) {
          console.error(
            `[citations] non-fatal failure for contract ${contract.id}:`,
            citErr instanceof Error ? citErr.message : citErr,
          );
        }

        // ── Stage 4: whole-document analysis — SKIPPED if already present ────
        // One Opus call per contract; skipping it on a resume avoids re-billing
        // the most expensive single call. Missing protections, cross-clause
        // conflicts, one-sided terms, executive summary. Non-fatal and additive.
        try {
          if (await hasDocumentAnalysis(client, contract.id)) {
            documentOk = true;
          } else {
            const docClauses: DocAnalyzerClause[] = clauseRows.map((r) => ({
              id: r.id,
              position: r.position ?? 0,
              sectionTitle: r.section_title ?? null,
              text: r.clause_text,
            }));
            // Cost gate (opt-in via DOC_ANALYSIS_GATE): skip the LLM doc pass for
            // a short AND clean contract. Conservative — `anyHighOrMissing` is
            // true whenever the per-clause risk state is unknown or only partially
            // computed (e.g. a partial resume), so we only ever skip a genuinely
            // simple document.
            const riskCoversAll =
              riskByClauseId != null && riskByClauseId.size === clauseCount;
            const anyHighOrMissing =
              !riskCoversAll ||
              [...riskByClauseId!.values()].some(
                (r) => r.riskLevel === "high" || r.riskLevel === "missing",
              );
            const docAnalysis = await analyzeDocument(
              {
                contractTitle: contract.title,
                clauses: docClauses,
              },
              {
                contractId: contract.id,
                gate: {
                  skipIfSimple: process.env.DOC_ANALYSIS_GATE === "1",
                  minClauses: readDocAnalysisMinClauses(),
                  clauseCount,
                  anyHighOrMissing,
                },
              },
            );
            documentOk = await persistDocumentAnalysis(
              client,
              contract.id,
              docAnalysis,
            );
          }
        } catch (docErr) {
          console.error(
            `[risk] document analysis non-fatal failure for contract ${contract.id}:`,
            docErr instanceof Error ? docErr.message : docErr,
          );
        }
      } catch (clfErr) {
        classificationOk = false;
        console.error(
          `[classification] non-fatal failure for contract ${contract.id}:`,
          clfErr instanceof Error ? clfErr.message : clfErr,
        );
      }
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

// True when this contract has already been parsed (structured_json written AND
// clause rows present). persistContract writes structured_json only after every
// clause is inserted, so this is a safe "parse complete" signal for resume.
async function isAlreadyParsed(
  client: SupabaseClient,
  contractId: string,
): Promise<boolean> {
  const { data } = await client
    .from("contracts")
    .select("structured_json")
    .eq("id", contractId)
    .maybeSingle();
  if (!data || data.structured_json == null) return false;

  const { count } = await client
    .from("clauses")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);
  return (count ?? 0) > 0;
}

async function loadClauseRows(
  client: SupabaseClient,
  contractId: string,
): Promise<ClauseRow[]> {
  const { data, error } = await client
    .from("clauses")
    .select("id, clause_text, section_title, position, risk_analyzed_at")
    .eq("contract_id", contractId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClauseRow[];
}

async function hasDocumentAnalysis(
  client: SupabaseClient,
  contractId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("contracts")
    .select("document_analysis")
    .eq("id", contractId)
    .maybeSingle();
  // Missing column (migration 0009 unapplied) → treat as "not present" so the
  // stage runs (and persist will no-op).
  if (error) return false;
  return Boolean(data?.document_analysis);
}

// Best-effort: stamp processing start + an initial heartbeat. Swallows the
// missing-column error so processing still works before migration 0011.
async function stampProcessingStart(
  client: SupabaseClient,
  contractId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("contracts")
    .update({ processing_started_at: now, analysis_heartbeat_at: now })
    .eq("id", contractId);
  if (error && error.code !== UNDEFINED_COLUMN) {
    console.warn(`[ingestion] heartbeat stamp failed for ${contractId}: ${error.message}`);
  }
}

async function touchHeartbeat(
  client: SupabaseClient,
  contractId: string,
): Promise<void> {
  const { error } = await client
    .from("contracts")
    .update({ analysis_heartbeat_at: new Date().toISOString() })
    .eq("id", contractId);
  if (error && error.code !== UNDEFINED_COLUMN) {
    console.warn(`[ingestion] heartbeat failed for ${contractId}: ${error.message}`);
  }
}

// A throttled, fire-and-forget heartbeat for the risk fan-out: bumps
// analysis_heartbeat_at at most once per HEARTBEAT_MIN_MS without ever blocking
// or failing the analysis loop.
function makeThrottledHeartbeat(
  client: SupabaseClient,
  contractId: string,
): () => void {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last < HEARTBEAT_MIN_MS) return;
    last = now;
    void touchHeartbeat(client, contractId).catch(() => {});
  };
}
