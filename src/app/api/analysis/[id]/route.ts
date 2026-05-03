import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_LABELS,
  isClassificationLabel,
  type ClassificationLabel,
} from "@/lib/classification/categories";
import { RISK_LEVELS } from "@/lib/risk";
import type { RiskLevel } from "@/lib/risk";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT_FIELDS = "id, status, processed_at";

const CLAUSE_FIELDS =
  "id, section_title, section_position, clause_number, position, clause_text, " +
  "risk_level, risk_issue, risk_explanation, risk_suggestion, risk_confidence, risk_method, risk_rule_ids, risk_analyzed_at, " +
  "trust_score, citations";

const CLASSIFICATION_FIELDS =
  "clause_id, category, confidence, method, matched_rule, reasoning, classified_at";

interface ClauseRow {
  id: string;
  section_title: string | null;
  section_position: number | null;
  clause_number: string | null;
  position: number | null;
  clause_text: string;
  risk_level: RiskLevel | null;
  risk_issue: string | null;
  risk_explanation: string | null;
  risk_suggestion: string | null;
  risk_confidence: number | null;
  risk_method: string | null;
  risk_rule_ids: string[] | null;
  risk_analyzed_at: string | null;
  trust_score: number | null;
  citations: unknown[] | null;
}

interface ClassificationRow {
  clause_id: string;
  category: string;
  confidence: number | null;
  method: string | null;
  matched_rule: string | null;
  reasoning: string | null;
  classified_at: string | null;
}

interface AnalysisClause {
  id: string;
  section_title: string | null;
  clause_number: string | null;
  position: number | null;
  clause_text: string;
  classification: {
    category: ClassificationLabel;
    confidence: number | null;
    method: string | null;
    matched_rule: string | null;
    reasoning: string | null;
  } | null;
  risk: {
    level: RiskLevel;
    issue: string | null;
    explanation: string | null;
    suggestion: string | null;
    confidence: number | null;
    method: string | null;
    rule_ids: string[] | null;
    analyzed_at: string | null;
  } | null;
  citations: unknown[] | null;
  trust_score: number | null;
}

type RiskBucket = RiskLevel | "unknown";

function emptyByRisk(): Record<RiskBucket, number> {
  const buckets = {} as Record<RiskBucket, number>;
  for (const level of RISK_LEVELS) buckets[level] = 0;
  buckets.unknown = 0;
  return buckets;
}

function emptyByCategory(): Record<ClassificationLabel, number> {
  const out = {} as Record<ClassificationLabel, number>;
  for (const label of ALL_LABELS) out[label] = 0;
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const [contractResult, clausesResult, classificationsResult] =
    await Promise.all([
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
        .order("position", { ascending: true }),
      supabase
        .from("clause_classifications")
        .select(CLASSIFICATION_FIELDS)
        .eq("contract_id", id)
        .order("classified_at", { ascending: false }),
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
  if (classificationsResult.error) {
    return NextResponse.json(
      {
        error: "classifications_query_failed",
        message: classificationsResult.error.message,
      },
      { status: 500 },
    );
  }

  const contract = contractResult.data as {
    id: string;
    status: string;
    processed_at: string | null;
  };
  const clauseRows = (clausesResult.data ?? []) as unknown as ClauseRow[];
  const classificationRows = (classificationsResult.data ??
    []) as unknown as ClassificationRow[];

  // Latest classification per clause (rows already sorted desc by classified_at).
  const classByClause = new Map<string, ClassificationRow>();
  for (const row of classificationRows) {
    if (!classByClause.has(row.clause_id)) {
      classByClause.set(row.clause_id, row);
    }
  }

  const byRisk = emptyByRisk();
  const byCategory = emptyByCategory();
  let trustScoreSum = 0;
  let trustScoreCount = 0;
  let citedClauses = 0;

  const clauses: AnalysisClause[] = clauseRows.map((row) => {
    const cls = classByClause.get(row.id);
    const category: ClassificationLabel | null =
      cls && isClassificationLabel(cls.category) ? cls.category : null;
    if (category) byCategory[category] += 1;

    if (row.risk_level) {
      byRisk[row.risk_level] += 1;
    } else {
      byRisk.unknown += 1;
    }

    if (typeof row.trust_score === "number") {
      trustScoreSum += row.trust_score;
      trustScoreCount += 1;
    }

    if (Array.isArray(row.citations) && row.citations.length > 0) {
      citedClauses += 1;
    }

    return {
      id: row.id,
      section_title: row.section_title,
      clause_number: row.clause_number,
      position: row.position,
      clause_text: row.clause_text,
      classification: cls
        ? {
            category: category ?? "other",
            confidence: cls.confidence,
            method: cls.method,
            matched_rule: cls.matched_rule,
            reasoning: cls.reasoning,
          }
        : null,
      risk: row.risk_level
        ? {
            level: row.risk_level,
            issue: row.risk_issue,
            explanation: row.risk_explanation,
            suggestion: row.risk_suggestion,
            confidence: row.risk_confidence,
            method: row.risk_method,
            rule_ids: row.risk_rule_ids,
            analyzed_at: row.risk_analyzed_at,
          }
        : null,
      citations: row.citations,
      trust_score: row.trust_score,
    };
  });

  return NextResponse.json(
    {
      contract_id: contract.id,
      status: contract.status,
      processed_at: contract.processed_at,
      summary: {
        total_clauses: clauses.length,
        by_risk: byRisk,
        by_category: byCategory,
        avg_trust_score:
          trustScoreCount > 0 ? trustScoreSum / trustScoreCount : null,
        cited_clauses: citedClauses,
      },
      clauses,
    },
    { status: 200 },
  );
}
