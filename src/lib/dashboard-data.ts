import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/types/ingestion";
import type { RiskLevel } from "@/types/contract";

export type DashboardStatus = "processing" | "failed" | "needs_attention" | "reviewed";

export interface DashboardContract {
  id: string;
  title: string;
  originalFilename: string;
  pageCount: number | null;
  status: DashboardStatus;
  uploadedAt: Date;
  processedAt: Date | null;
  riskCounts: {
    high: number;
    medium: number;
    low: number;
    standard: number;
    missing: number;
  };
}

export interface DashboardStats {
  needsAttention: number;
  inProgress: number;
  highRisk: number;
  totalHighClauses: number;
}

interface ContractRow {
  id: string;
  title: string;
  original_filename: string;
  page_count: number | null;
  status: JobStatus;
  uploaded_at: string;
  processed_at: string | null;
}

interface ClauseRow {
  contract_id: string;
  risk_level: RiskLevel | null;
}

function emptyCounts(): DashboardContract["riskCounts"] {
  return { high: 0, medium: 0, low: 0, standard: 0, missing: 0 };
}

function deriveStatus(
  row: ContractRow,
  counts: DashboardContract["riskCounts"],
): DashboardStatus {
  if (row.status === "queued" || row.status === "processing") return "processing";
  if (row.status === "failed") return "failed";
  // Surface medium-only contracts too — counsel shouldn't silently miss
  // material medium risk just because there are zero high-risk clauses.
  return counts.high > 0 || counts.medium > 0 ? "needs_attention" : "reviewed";
}

export async function loadDashboard(ownerUserId: string): Promise<{
  contracts: DashboardContract[];
  stats: DashboardStats;
}> {
  const supabase = await createClient();

  // Defence-in-depth: scope explicitly to the authed user in addition to RLS.
  // CLAUDE.md: every query must be tenant-scoped — never rely on RLS alone.
  const { data: contractRows } = await supabase
    .from("contracts")
    .select("id, title, original_filename, page_count, status, uploaded_at, processed_at")
    .eq("owner_user_id", ownerUserId)
    .order("uploaded_at", { ascending: false });

  const rows = (contractRows ?? []) as ContractRow[];
  if (rows.length === 0) {
    return {
      contracts: [],
      stats: { needsAttention: 0, inProgress: 0, highRisk: 0, totalHighClauses: 0 },
    };
  }

  const ids = rows.map((r) => r.id);
  const { data: clauseRows } = await supabase
    .from("clauses")
    .select("contract_id, risk_level")
    .in("contract_id", ids);

  const countsById = new Map<string, DashboardContract["riskCounts"]>();
  for (const id of ids) countsById.set(id, emptyCounts());
  for (const c of (clauseRows ?? []) as ClauseRow[]) {
    if (!c.risk_level) continue;
    const bucket = countsById.get(c.contract_id);
    if (bucket) bucket[c.risk_level] += 1;
  }

  const contracts: DashboardContract[] = rows.map((r) => {
    const riskCounts = countsById.get(r.id) ?? emptyCounts();
    return {
      id: r.id,
      title: r.title,
      originalFilename: r.original_filename,
      pageCount: r.page_count,
      status: deriveStatus(r, riskCounts),
      uploadedAt: new Date(r.uploaded_at),
      processedAt: r.processed_at ? new Date(r.processed_at) : null,
      riskCounts,
    };
  });

  const stats: DashboardStats = {
    needsAttention: contracts.filter((c) => c.status === "needs_attention").length,
    inProgress: contracts.filter((c) => c.status === "processing").length,
    highRisk: contracts.filter((c) => c.riskCounts.high > 0).length,
    totalHighClauses: contracts.reduce((sum, c) => sum + c.riskCounts.high, 0),
  };

  return { contracts, stats };
}
