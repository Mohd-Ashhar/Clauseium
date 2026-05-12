import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  assertInternalRequest,
  InternalAuthError,
} from "@/lib/ingestion/internal-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { analyzeClauseRisks, persistRiskAnalyses } from "@/lib/risk";
import {
  isClassificationLabel,
  type ClassificationLabel,
} from "@/lib/classification/categories";

// POST /api/admin/reanalyze-unparseable
//
// One-shot maintenance endpoint. Finds every clause that's stuck in the
// legacy "Risk analyzer returned an unparseable response" state OR was
// tagged with LLM_PARSE_FAILED by the new analyzer, and reruns each
// affected contract through the risk pipeline.
//
// Auth: x-internal-secret header (INTERNAL_PROCESSING_SECRET) — same gate
// as /api/contracts/[id]/process. Service-role Supabase client is used to
// bypass RLS so we can read across all owners.
//
// Idempotent. Safe to call repeatedly; clauses that now pass the analyzer
// won't match the filter on the next run.

export const runtime = "nodejs";
export const maxDuration = 300;

const LEGACY_ISSUE_LIKE = "%unparseable response%";

interface BrokenClauseRow {
  id: string;
  contract_id: string;
  clause_text: string;
}

interface ClassificationRow {
  clause_id: string;
  category: string;
  confidence: number | null;
}

export async function POST(req: Request) {
  try {
    assertInternalRequest(req);
  } catch (err) {
    if (err instanceof InternalAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const runId = randomUUID();
  const service = createServiceRoleClient();

  // Two filters joined by OR. PostgREST .or() expects a comma-separated
  // string of single-filter expressions; cs.{...} is "contains".
  const { data: brokenRows, error: brokenErr } = await service
    .from("clauses")
    .select("id, contract_id, clause_text")
    .or(
      `risk_issue.ilike.${LEGACY_ISSUE_LIKE},risk_rule_ids.cs.{LLM_PARSE_FAILED}`,
    );

  if (brokenErr) {
    return NextResponse.json(
      { error: "scan_failed", message: brokenErr.message },
      { status: 500 },
    );
  }

  const broken = (brokenRows ?? []) as BrokenClauseRow[];
  const scanned = broken.length;

  if (scanned === 0) {
    return NextResponse.json(
      { runId, scanned: 0, retried: 0, succeeded: 0, still_failing: 0 },
      { status: 200 },
    );
  }

  // Group clauses by contract_id so persistRiskAnalyses can write each
  // contract's results in one pass.
  const byContract = new Map<string, BrokenClauseRow[]>();
  for (const row of broken) {
    const list = byContract.get(row.contract_id) ?? [];
    list.push(row);
    byContract.set(row.contract_id, list);
  }

  let retried = 0;
  let succeeded = 0;
  let stillFailing = 0;

  for (const [contractId, rows] of byContract) {
    const candidateIds = rows.map((r) => r.id);
    const { data: classRows, error: classErr } = await service
      .from("clause_classifications")
      .select("clause_id, category, confidence")
      .eq("contract_id", contractId)
      .in("clause_id", candidateIds);

    if (classErr) {
      console.error(
        `[reanalyze] classification lookup failed for contract ${contractId}: ${classErr.message}`,
      );
      stillFailing += rows.length;
      continue;
    }

    const classByClause = new Map<string, ClassificationRow>();
    for (const row of (classRows ?? []) as ClassificationRow[]) {
      classByClause.set(row.clause_id, row);
    }

    const riskInputs = rows.map((r) => {
      const cls = classByClause.get(r.id);
      const category: ClassificationLabel =
        cls && isClassificationLabel(cls.category) ? cls.category : "other";
      return {
        clauseId: r.id,
        clauseText: r.clause_text,
        category,
        classificationConfidence: cls?.confidence ?? 0,
      };
    });

    try {
      const results = await analyzeClauseRisks(riskInputs);
      await persistRiskAnalyses(service, contractId, results);
      retried += results.length;
      // Count as "succeeded" any result that DIDN'T fall through to the
      // soft fallback. The orchestrator tags those rows with
      // LLM_PARSE_FAILED in ruleIds.
      for (const r of results) {
        if (r.ruleIds.includes("LLM_PARSE_FAILED")) stillFailing += 1;
        else succeeded += 1;
      }
    } catch (err) {
      console.error(
        `[reanalyze] analyze failed for contract ${contractId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      stillFailing += rows.length;
    }
  }

  return NextResponse.json(
    {
      runId,
      scanned,
      retried,
      succeeded,
      still_failing: stillFailing,
      contracts_touched: byContract.size,
    },
    { status: 200 },
  );
}
