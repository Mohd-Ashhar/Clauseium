import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, StructuredDocument } from "@/types/ingestion";
import type {
  ClassificationLabel,
  ClassificationMethod,
} from "@/lib/classification";
import type {
  DocumentAnalysisView,
  LegalCitation,
  RiskLevel,
} from "@/types/contract";
import type { RiskMethod } from "@/lib/risk";
import {
  StatusBanner,
  UploadWorkspace,
  type ClauseWorkspaceItem,
  type WorkspaceSummary,
} from "@/components/uploads/upload-workspace";
import type { ClauseActionState } from "@/components/uploads/clause-actions";

interface ContractRow {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  page_count: number | null;
  status: JobStatus;
  error_message: string | null;
  structured_json: StructuredDocument | null;
  document_analysis: DocumentAnalysisView | null;
  uploaded_at: string;
  processed_at: string | null;
}

const ACTION_STATES = ["accepted", "modified", "rejected"] as const;
function isActionState(s: string): s is (typeof ACTION_STATES)[number] {
  return (ACTION_STATES as readonly string[]).includes(s);
}

export default async function UploadResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, title, original_filename, mime_type, file_size_bytes, page_count, status, error_message, structured_json, uploaded_at, processed_at",
    )
    .eq("id", id)
    // Defence-in-depth alongside RLS — never rely on RLS alone (CLAUDE.md).
    .eq("owner_user_id", user.id)
    .maybeSingle<ContractRow>();

  if (error || !data) notFound();

  // Best-effort fetch of the whole-document analysis. Kept in a separate query
  // (not the main select) so a database that has not yet run migration 0009
  // still renders — the column-missing error degrades to "no analysis".
  let documentAnalysis: DocumentAnalysisView | null = null;
  {
    const { data: docRow } = await supabase
      .from("contracts")
      .select("document_analysis")
      .eq("id", id)
      .maybeSingle<{ document_analysis: DocumentAnalysisView | null }>();
    documentAnalysis = docRow?.document_analysis ?? null;
  }

  if (data.status !== "ready" || !data.structured_json) {
    return (
      <div className="-mx-6 -my-6 min-h-[calc(100vh-3.5rem)] bg-ink-950 px-6 py-8">
        <StatusBanner
          contractId={data.id}
          status={
            data.status === "failed"
              ? "failed"
              : data.status === "processing"
                ? "processing"
                : "queued"
          }
          errorMessage={data.error_message}
        />
      </div>
    );
  }

  // Load the caller's clause actions, tolerating a DB that has not yet run
  // migration 0010 (modified_text) — fall back to the older projection so a
  // reviewer's accept/reject decisions never vanish before the migration runs.
  const loadActions = async (): Promise<Array<Record<string, unknown>>> => {
    const primary = await supabase
      .from("clause_actions")
      .select("clause_id, state, note, modified_text")
      .eq("owner_user_id", user.id);
    if (primary.error?.code === "42703") {
      const fallback = await supabase
        .from("clause_actions")
        .select("clause_id, state, note")
        .eq("owner_user_id", user.id);
      return (fallback.data ?? []) as Array<Record<string, unknown>>;
    }
    return (primary.data ?? []) as Array<Record<string, unknown>>;
  };

  // Fetch all per-clause derived data in one shot, plus the user's actions.
  const [{ data: clauseRows }, actionRows] = await Promise.all([
    supabase
      .from("clauses")
      .select(
        "id, position, clause_text, section_title, citations, trust_score, risk_level, risk_issue, risk_explanation, risk_suggestion, risk_confidence, risk_method, risk_rule_ids, clause_classifications(category, confidence, method, classified_at)",
      )
      .eq("contract_id", id),
    loadActions(),
  ]);

  type ClauseRowFull = {
    id: string;
    position: number;
    clause_text: string;
    section_title: string;
    citations: LegalCitation[] | null;
    trust_score: number | string | null;
    risk_level: RiskLevel | null;
    risk_issue: string | null;
    risk_explanation: string | null;
    risk_suggestion: string | null;
    risk_confidence: number | string | null;
    risk_method: RiskMethod | null;
    risk_rule_ids: string[] | null;
    clause_classifications:
      | {
          category: ClassificationLabel;
          confidence: number | string;
          method: ClassificationMethod;
          classified_at: string;
        }[]
      | null;
  };

  type ActionRow = {
    clause_id: string;
    state: string;
    note: string | null;
    modified_text?: string | null;
  };

  // `clause_actions` may not exist yet (migration 0006 unapplied) — fall back
  // to an empty map so the page still renders. The API route returns 500 in
  // that case; the table presence is the source of truth.
  const actions = new Map<
    string,
    { state: ClauseActionState; note: string | null; modifiedText: string | null }
  >();
  for (const row of (actionRows ?? []) as ActionRow[]) {
    if (isActionState(row.state)) {
      actions.set(row.clause_id, {
        state: row.state,
        note: row.note,
        modifiedText: row.modified_text ?? null,
      });
    }
  }

  // Build the position → derived map first so the workspace clause list and
  // the document pane share the same lookup. The clause's UUID is the join
  // key (workspace renders by UUID, document renders structured_json which
  // also stores the UUID per clause).
  const byId = new Map<string, ClauseWorkspaceItem>();
  const summary: WorkspaceSummary = {
    high: 0,
    medium: 0,
    missing: 0,
    low: 0,
    standard: 0,
    totalClauses: 0,
    verifiedCitations: 0,
    partialCitations: 0,
    droppedCitations: 0,
    overallTrust: null,
    overallRiskScore: 0,
  };

  let trustSum = 0;
  let trustCount = 0;
  for (const row of (clauseRows ?? []) as ClauseRowFull[]) {
    summary.totalClauses += 1;
    const list = row.clause_classifications ?? [];
    let cls: ClauseWorkspaceItem["classification"] = null;
    if (list.length > 0) {
      const latest = [...list].sort((a, b) =>
        a.classified_at < b.classified_at ? 1 : -1,
      )[0];
      const conf =
        typeof latest.confidence === "string"
          ? Number.parseFloat(latest.confidence)
          : latest.confidence;
      cls = { category: latest.category, confidence: conf, method: latest.method };
    }

    const cites = Array.isArray(row.citations) ? row.citations : [];
    const trust =
      typeof row.trust_score === "string"
        ? Number.parseFloat(row.trust_score)
        : row.trust_score;
    if (typeof trust === "number" && Number.isFinite(trust)) {
      trustSum += trust;
      trustCount += 1;
    }
    for (const c of cites) {
      if (c.status === "verified") summary.verifiedCitations += 1;
      else if (c.status === "partially_verified") summary.partialCitations += 1;
    }

    let risk: ClauseWorkspaceItem["risk"] = null;
    if (row.risk_level) {
      const riskConf =
        typeof row.risk_confidence === "string"
          ? Number.parseFloat(row.risk_confidence)
          : row.risk_confidence;
      risk = {
        level: row.risk_level,
        issue: row.risk_issue,
        explanation: row.risk_explanation,
        suggestion: row.risk_suggestion,
        confidence:
          typeof riskConf === "number" && Number.isFinite(riskConf)
            ? riskConf
            : null,
        method: row.risk_method,
        ruleIds: Array.isArray(row.risk_rule_ids) ? row.risk_rule_ids : [],
      };
      summary[row.risk_level] += 1;
    }

    const action = actions.get(row.id);

    byId.set(row.id, {
      id: row.id,
      position: row.position,
      text: row.clause_text,
      sectionTitle: row.section_title,
      classification: cls,
      risk,
      citations: cites,
      trustScore:
        typeof trust === "number" && Number.isFinite(trust) ? trust : null,
      action: action?.state ?? "pending",
      actionNote: action?.note ?? null,
      actionModifiedText: action?.modifiedText ?? null,
    });
  }

  summary.overallTrust = trustCount > 0 ? trustSum / trustCount : null;
  // Risk score: weighted blend where high counts more, normalised to 0–100.
  // Higher score = healthier contract. Empty contract: 0.
  if (summary.totalClauses > 0) {
    const risky = summary.high * 6 + summary.medium * 2 + summary.missing * 3;
    const ceiling = summary.totalClauses * 6;
    const ratio = ceiling === 0 ? 0 : Math.min(1, risky / ceiling);
    summary.overallRiskScore = Math.round((1 - ratio) * 100);
  }

  // Render the document pane against `byId` (UUID-keyed). The structured_json
  // sections carry clause UUIDs in `clause.id` so the lookup is direct; no
  // positional fallback needed because both come from the same persistence.
  const clauses: ClauseWorkspaceItem[] = Array.from(byId.values()).sort(
    (a, b) => a.position - b.position,
  );

  return (
    <UploadWorkspace
      contractId={data.id}
      contractTitle={data.title}
      originalFilename={data.original_filename}
      pageCount={data.page_count}
      structured={data.structured_json}
      clauses={clauses}
      summary={summary}
      documentAnalysis={documentAnalysis}
      // A 'ready' contract that still carries an error_message had a degraded
      // analysis stage — surface it as a non-blocking warning.
      partial={Boolean(data.error_message)}
      analysisNotes={data.error_message ? [data.error_message] : []}
    />
  );
}
