import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/auth/get-authed-context";
import {
  ALL_LABELS,
  isClassificationLabel,
  type ClassificationLabel,
} from "@/lib/classification/categories";
import { RISK_LEVELS } from "@/lib/risk";
import type { RiskLevel } from "@/lib/risk";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT_FIELDS = "id, status, processed_at, error_message";

const CLAUSE_FIELDS =
  "id, section_title, section_position, clause_number, position, clause_text, search_anchor, " +
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
  search_anchor: string | null;
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
  search_anchor: string | null;
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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { supabase } = ctx;

  const { id } = await params;

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
    error_message: string | null;
  };

  // Best-effort whole-document analysis fetch. Separate query so a database
  // without migration 0009 still returns the rest of the analysis.
  let documentAnalysis: unknown = null;
  {
    const { data: docRow } = await supabase
      .from("contracts")
      .select("document_analysis")
      .eq("id", id)
      .maybeSingle<{ document_analysis: unknown }>();
    documentAnalysis = docRow?.document_analysis ?? null;
  }

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

    // Non-substantive paragraphs (template comments, page markers, bare
    // headings) are tagged at analyze time and rendered as risk: null so
    // they don't surface a "Standard · …" callout in any UI surface.
    const isNonSubstantive =
      Array.isArray(row.risk_rule_ids) &&
      row.risk_rule_ids.includes("NON_SUBSTANTIVE");

    if (row.risk_level && !isNonSubstantive) {
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
      search_anchor: row.search_anchor,
      classification: cls
        ? {
            category: category ?? "other",
            confidence: cls.confidence,
            method: cls.method,
            matched_rule: cls.matched_rule,
            reasoning: cls.reasoning,
          }
        : null,
      risk:
        row.risk_level && !isNonSubstantive
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
      // A 'ready' contract that still carries an error_message had a degraded
      // analysis stage; surface it so clients can warn instead of showing a
      // misleading clean result.
      partial: contract.status === "ready" && Boolean(contract.error_message),
      partial_reason:
        contract.status === "ready" ? contract.error_message : null,
      document_analysis: documentAnalysis,
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
