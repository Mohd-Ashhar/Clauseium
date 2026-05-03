import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { analyzeClauseRisks, persistRiskAnalyses } from "@/lib/risk";
import { verifyAndPersistCitations } from "@/lib/citations/persist";
import {
  isClassificationLabel,
  type ClassificationLabel,
} from "@/lib/classification/categories";
import type { ClassificationResult } from "@/lib/classification/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  force: z.boolean().optional().default(false),
});

interface ClauseRow {
  id: string;
  clause_text: string;
  risk_analyzed_at: string | null;
}

interface ClassificationRow {
  clause_id: string;
  category: string;
  confidence: number | null;
  reasoning: string | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const userClient = await createClient();
  const { data: contract, error: contractErr } = await userClient
    .from("contracts")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (contractErr) {
    return NextResponse.json(
      { error: "query_failed", message: contractErr.message },
      { status: 500 },
    );
  }
  if (!contract) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = req.body ? await req.json() : {};
    body = bodySchema.parse(json ?? {});
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: err instanceof Error ? err.message : "invalid JSON",
      },
      { status: 400 },
    );
  }

  // Switch to service role for the heavy lifting (LLM, RAG, multi-row updates).
  const service = createServiceRoleClient();

  const { data: clauseRows, error: clausesErr } = await service
    .from("clauses")
    .select("id, clause_text, risk_analyzed_at")
    .eq("contract_id", id);

  if (clausesErr) {
    return NextResponse.json(
      { error: "clauses_query_failed", message: clausesErr.message },
      { status: 500 },
    );
  }

  const allClauses = (clauseRows ?? []) as ClauseRow[];
  const candidates = body.force
    ? allClauses
    : allClauses.filter((c) => !c.risk_analyzed_at);

  if (candidates.length === 0) {
    return NextResponse.json(
      { analyzed: 0, skipped: allClauses.length, runId: randomUUID() },
      { status: 200 },
    );
  }

  const candidateIds = candidates.map((c) => c.id);
  const { data: classRows, error: classErr } = await service
    .from("clause_classifications")
    .select("clause_id, category, confidence, reasoning")
    .eq("contract_id", id)
    .in("clause_id", candidateIds);

  if (classErr) {
    return NextResponse.json(
      { error: "classifications_query_failed", message: classErr.message },
      { status: 500 },
    );
  }

  const classByClause = new Map<string, ClassificationRow>();
  for (const row of (classRows ?? []) as ClassificationRow[]) {
    classByClause.set(row.clause_id, row);
  }

  const riskInputs = candidates.map((c) => {
    const cls = classByClause.get(c.id);
    const category: ClassificationLabel =
      cls && isClassificationLabel(cls.category) ? cls.category : "other";
    return {
      clauseId: c.id,
      clauseText: c.clause_text,
      category,
      classificationConfidence: cls?.confidence ?? 0,
    };
  });

  const riskResults = await analyzeClauseRisks(riskInputs);
  await persistRiskAnalyses(service, id, riskResults);

  // Re-run citation verification with the enriched carrier.
  const clauseInputs = candidates.map((c) => ({
    id: c.id,
    text: c.clause_text,
  }));
  const classificationsForVerify: ClassificationResult[] = candidates.map((c) => {
    const cls = classByClause.get(c.id);
    const category: ClassificationLabel =
      cls && isClassificationLabel(cls.category) ? cls.category : "other";
    return {
      clauseId: c.id,
      category,
      confidence: cls?.confidence ?? 0,
      method: "rule",
      matchedRule: null,
      model: null,
      reasoning: cls?.reasoning ?? null,
    };
  });

  try {
    await verifyAndPersistCitations(
      service,
      clauseInputs,
      classificationsForVerify,
      { riskByClauseId: new Map(riskResults.map((r) => [r.clauseId, r])) },
    );
  } catch (err) {
    console.error(
      `[risk] verification step failed for contract ${id}:`,
      err instanceof Error ? err.message : err,
    );
  }

  return NextResponse.json(
    {
      analyzed: riskResults.length,
      skipped: allClauses.length - candidates.length,
      runId: randomUUID(),
    },
    { status: 200 },
  );
}
