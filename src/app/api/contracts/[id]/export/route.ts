import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthedContext } from "@/lib/auth/get-authed-context";
import type { ClassificationLabel } from "@/lib/classification";
import type { RiskLevel, LegalCitation } from "@/types/contract";
import { resolveExportText } from "@/lib/export/shared/decisions";
import { injectRedlines } from "@/lib/export/ooxml/inject-redlines";
import type { EngineClause, RedlineMode } from "@/lib/export/ooxml/types";
import {
  buildContractForExport,
  type ExportActionRow,
  type ExportClauseRow,
} from "@/lib/export/build-contract";
import { buildFilename, mimeTypeFor } from "@/lib/export/filename";
import { AI_AUTHOR } from "@/lib/export/shared/branding";
import type { ClauseState } from "@/lib/export/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const UNDEFINED_COLUMN = "42703";

const bodySchema = z.object({
  format: z.enum(["redlined", "clean", "summary", "full"]),
});

function stripCite(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s*\[CITE:[^\]]+\]/gi, "").replace(/\s+\./g, ".").trim();
}

interface ContractRow {
  id: string;
  title: string;
  mime_type: string;
  storage_path: string;
  page_count: number | null;
  original_filename: string;
  status: string;
}

interface ClauseRow {
  id: string;
  position: number;
  clause_text: string;
  section_title: string | null;
  clause_number: string | null;
  risk_level: RiskLevel | null;
  risk_issue: string | null;
  risk_explanation: string | null;
  risk_suggestion: string | null;
  risk_confidence: number | string | null;
  citations: LegalCitation[] | null;
  trust_score: number | string | null;
  clause_classifications:
    | { category: ClassificationLabel; classified_at: string }[]
    | null;
}

interface ActionRecord {
  state: ClauseState;
  modifiedText: string | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { user, supabase } = ctx;
  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const format = parsed.data.format;

  // Ownership + metadata (RLS-bound).
  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .select(
      "id, title, mime_type, storage_path, page_count, original_filename, status",
    )
    .eq("id", id)
    .maybeSingle<ContractRow>();

  if (contractErr) {
    return NextResponse.json(
      { error: "query_failed", message: contractErr.message },
      { status: 500 },
    );
  }
  if (!contract) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (contract.status !== "ready") {
    return NextResponse.json(
      { error: "not_ready", message: "Contract is still processing." },
      { status: 422 },
    );
  }

  // Clauses (ordered) + the caller's decisions.
  const { data: clauseData, error: clauseErr } = await supabase
    .from("clauses")
    .select(
      "id, position, clause_text, section_title, clause_number, risk_level, risk_issue, risk_explanation, risk_suggestion, risk_confidence, citations, trust_score, clause_classifications(category, classified_at)",
    )
    .eq("contract_id", id)
    .order("position", { ascending: true });

  if (clauseErr) {
    return NextResponse.json(
      { error: "clauses_query_failed", message: clauseErr.message },
      { status: 500 },
    );
  }
  const clauseRows = (clauseData ?? []) as unknown as ClauseRow[];

  const actionByClause = await loadActions(supabase, user.id);

  try {
    if (format === "redlined" || format === "clean") {
      if (contract.mime_type === DOCX_MIME) {
        return await exportTrackedDocx(
          supabase,
          contract,
          clauseRows,
          actionByClause,
          format,
        );
      }
      // PDF (or other non-editable) original → reconstructed fallback.
      return await exportReconstructedDocx(
        contract,
        clauseRows,
        actionByClause,
        format,
      );
    }
    // summary | full → PDF
    return await exportPdf(contract, clauseRows, actionByClause, format);
  } catch (err) {
    console.error(`[export] ${format} failed for ${id}:`, err);
    const message = err instanceof Error ? err.message : "export failed";
    const badSource =
      /not a valid \.docx|document\.xml not found|w:body not found/i.test(message);
    return NextResponse.json(
      {
        error: badSource ? "invalid_source_document" : "export_failed",
        message: badSource
          ? "The stored source document could not be read as a .docx."
          : message,
      },
      { status: badSource ? 422 : 500 },
    );
  }
}

async function loadActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, ActionRecord>> {
  // RLS boundary: clause_actions is row-scoped to owner_user_id = auth.uid() AND
  // the clause → contract ownership chain (migration 0006). The caller already
  // verified contract ownership; this query stays confined to that identity.
  const map = new Map<string, ActionRecord>();
  const primary = await supabase
    .from("clause_actions")
    .select("clause_id, state, modified_text")
    .eq("owner_user_id", userId);

  let rows: Array<Record<string, unknown>>;
  if (primary.error?.code === UNDEFINED_COLUMN) {
    // 0010 not applied — re-select without modified_text.
    const fb = await supabase
      .from("clause_actions")
      .select("clause_id, state")
      .eq("owner_user_id", userId);
    // Surface a genuine failure rather than silently exporting zero decisions
    // (which would treat every clause as pending and mis-render the redline).
    if (fb.error) {
      throw new Error(`clause_actions query failed: ${fb.error.message}`);
    }
    rows = (fb.data ?? []) as Array<Record<string, unknown>>;
  } else if (primary.error) {
    throw new Error(`clause_actions query failed: ${primary.error.message}`);
  } else {
    rows = (primary.data ?? []) as Array<Record<string, unknown>>;
  }
  for (const r of rows) {
    map.set(r.clause_id as string, {
      state: r.state as ClauseState,
      modifiedText:
        "modified_text" in r ? ((r.modified_text as string | null) ?? null) : null,
    });
  }
  return map;
}

function fileResponse(
  bytes: Buffer,
  filename: string,
  mimeType: string,
  extraHeaders: Record<string, string> = {},
): Response {
  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  return new Response(bytes as unknown as BodyInit, { headers });
}

async function exportTrackedDocx(
  supabase: SupabaseClient,
  contract: ContractRow,
  clauseRows: ClauseRow[],
  actions: Map<string, ActionRecord>,
  format: "redlined" | "clean",
): Promise<Response> {
  const { data: blob, error } = await supabase.storage
    .from("contracts")
    .download(contract.storage_path);
  if (error || !blob) {
    return NextResponse.json(
      { error: "storage_download_failed", message: error?.message ?? "no data" },
      { status: 502 },
    );
  }
  const originalDocx = Buffer.from(await blob.arrayBuffer());
  const mode: RedlineMode = format;

  const engineClauses: EngineClause[] = clauseRows.map((c) => {
    const action = actions.get(c.id);
    const resolved = resolveExportText(
      {
        riskLevel: c.risk_level ?? "standard",
        originalText: c.clause_text,
        suggestedRedline: c.risk_suggestion ?? null,
      },
      action ? { state: action.state, modifiedText: action.modifiedText } : undefined,
      mode,
    );
    // Map the resolver op to the engine op. "keep" (rejected / pending in clean
    // mode / no suggestion) and "drop" (a missing clause not being added) both
    // mean "leave the document untouched" → engine "skip".
    const op: EngineClause["op"] =
      resolved.op === "replace"
        ? "replace"
        : resolved.op === "insert"
          ? "insert"
          : "skip";
    return {
      id: c.id,
      position: c.position,
      searchAnchor: null,
      clauseText: c.clause_text,
      sectionTitle: c.section_title,
      op,
      newText: stripCite(resolved.newText),
    };
  });

  const result = injectRedlines({
    originalDocx,
    clauses: engineClauses,
    mode,
    rev: { author: AI_AUTHOR, dateIso: exportDateIso() },
  });

  const filename = buildFilename({
    contract: { title: contract.title, version: 1 },
    format,
  });
  return fileResponse(result.bytes, filename, mimeTypeFor[format], {
    "X-Redline-Applied": String(result.applied),
    "X-Redline-Fallback": String(result.fallback),
    "X-Redline-Skipped": String(result.skipped),
  });
}

async function exportReconstructedDocx(
  contract: ContractRow,
  clauseRows: ClauseRow[],
  actions: Map<string, ActionRecord>,
  format: "redlined" | "clean",
): Promise<Response> {
  const { contract: built, clauseStates } = buildView(contract, clauseRows, actions);
  const input = {
    contract: built,
    clauseStates,
    format,
    includeReasoning: true,
  };
  const blob =
    format === "redlined"
      ? await (await import("@/lib/export/docx-redlined")).generateRedlinedDocx(input)
      : await (await import("@/lib/export/docx-clean")).generateCleanDocx(input);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const filename = buildFilename({
    contract: { title: contract.title, version: 1 },
    format,
  });
  return fileResponse(bytes, filename, mimeTypeFor[format], {
    "X-Redline-Reconstructed": "true",
  });
}

async function exportPdf(
  contract: ContractRow,
  clauseRows: ClauseRow[],
  actions: Map<string, ActionRecord>,
  format: "summary" | "full",
): Promise<Response> {
  const { contract: built, clauseStates } = buildView(contract, clauseRows, actions);
  const { renderSummaryPdf, renderFullReportPdf } = await import(
    "@/lib/export/pdf-server"
  );
  const bytes =
    format === "summary"
      ? await renderSummaryPdf(built)
      : await renderFullReportPdf(built, clauseStates);
  const filename = buildFilename({
    contract: { title: contract.title, version: 1 },
    format,
  });
  return fileResponse(bytes, filename, mimeTypeFor[format]);
}

function buildView(
  contract: ContractRow,
  clauseRows: ClauseRow[],
  actions: Map<string, ActionRecord>,
) {
  const exportClauses: ExportClauseRow[] = clauseRows.map((c) => ({
    id: c.id,
    position: c.position,
    clause_text: c.clause_text,
    section_title: c.section_title,
    clause_number: c.clause_number,
    category: latestCategory(c.clause_classifications),
    risk_level: c.risk_level,
    risk_issue: c.risk_issue,
    risk_explanation: c.risk_explanation,
    risk_suggestion: c.risk_suggestion,
    risk_confidence: c.risk_confidence,
    citations: c.citations,
    trust_score: c.trust_score,
  }));
  const exportActions: ExportActionRow[] = [];
  for (const [clauseId, a] of actions) {
    exportActions.push({
      clause_id: clauseId,
      state: a.state,
      modified_text: a.modifiedText,
    });
  }
  return buildContractForExport({
    contract: {
      id: contract.id,
      title: contract.title,
      page_count: contract.page_count,
      original_filename: contract.original_filename,
    },
    clauses: exportClauses,
    actions: exportActions,
  });
}

function latestCategory(
  list: { category: ClassificationLabel; classified_at: string }[] | null,
): ClassificationLabel | null {
  if (!list || list.length === 0) return null;
  return [...list].sort((a, b) => (a.classified_at < b.classified_at ? 1 : -1))[0]
    .category;
}

// A fixed timestamp per export run. Date.now is fine in a request handler.
function exportDateIso(): string {
  return new Date().toISOString();
}
