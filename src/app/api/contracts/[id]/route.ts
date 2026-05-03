import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const CONTRACT_FIELDS =
  "id, title, original_filename, mime_type, file_size_bytes, page_count, status, error_message, uploaded_at, processed_at";

const CLAUSE_FIELDS =
  "id, section_title, section_position, clause_number, position, clause_text, " +
  "risk_level, risk_issue, risk_explanation, risk_suggestion, risk_confidence, risk_method, risk_analyzed_at, " +
  "trust_score, citations, citations_updated_at";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const queryParse = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });
  if (!queryParse.success) {
    return NextResponse.json(
      { error: "invalid_query", issues: queryParse.error.flatten() },
      { status: 400 },
    );
  }
  const limit = queryParse.data.limit ?? DEFAULT_LIMIT;
  const offset = queryParse.data.offset ?? 0;

  const supabase = await createClient();

  const [contractResult, clausesResult, countResult] = await Promise.all([
    supabase
      .from("contracts")
      .select(CONTRACT_FIELDS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("clauses")
      .select(CLAUSE_FIELDS)
      .eq("contract_id", id)
      .order("section_position", { ascending: true })
      .order("position", { ascending: true })
      .range(offset, offset + limit - 1),
    supabase
      .from("clauses")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", id),
  ]);

  if (contractResult.error) {
    return NextResponse.json(
      { error: "query_failed", message: contractResult.error.message },
      { status: 500 },
    );
  }
  if (!contractResult.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (clausesResult.error) {
    return NextResponse.json(
      { error: "clauses_query_failed", message: clausesResult.error.message },
      { status: 500 },
    );
  }
  if (countResult.error) {
    return NextResponse.json(
      { error: "count_query_failed", message: countResult.error.message },
      { status: 500 },
    );
  }

  const clauses = clausesResult.data ?? [];
  const total = countResult.count ?? clauses.length;

  return NextResponse.json(
    {
      contract: contractResult.data,
      clauses,
      pagination: {
        total,
        returned: clauses.length,
        limit,
        offset,
      },
    },
    { status: 200 },
  );
}
