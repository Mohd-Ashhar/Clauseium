import "server-only";
import type {
  ClauseAnalysis,
  ClauseCategory,
  Contract,
  ContractType,
  LegalCitation,
  RiskLevel,
} from "@/types/contract";
import type { ClassificationLabel } from "@/lib/classification";
import type { ClauseState } from "./types";
import {
  deriveClauseSummary,
  displayRuleIds,
  sanitizeForExport,
} from "./shared/clause-comment";

// Build the export view-model (`Contract` + per-clause decision states) from raw
// DB rows, server-side. This is the authoritative builder used by the export
// route for the PDF generators and the reconstructed-docx fallback. The OOXML
// engine does NOT use this — it works directly off the original document + clause
// rows. Mirrors the old client `buildContractForExport` but reads persisted
// clause_actions (incl. modified_text) so the download reflects exactly what the
// reviewer decided.

export interface ExportContractRow {
  id: string;
  title: string;
  page_count: number | null;
  original_filename: string;
}

export interface ExportClauseRow {
  id: string;
  position: number;
  clause_text: string;
  section_title: string | null;
  clause_number: string | null;
  category: ClassificationLabel | null;
  risk_level: RiskLevel | null;
  risk_issue: string | null;
  risk_explanation: string | null;
  risk_suggestion: string | null;
  risk_confidence: number | string | null;
  risk_rule_ids: string[] | null;
  citations: LegalCitation[] | null;
  trust_score: number | string | null;
}

export interface ExportActionRow {
  clause_id: string;
  state: ClauseState; // accepted | modified | rejected (pending = no row)
  modified_text: string | null;
}

// ClassificationLabel → ClauseCategory. Every label is also a valid clause
// category, so this is effectively identity; the important part is the honest
// "other" fallback when a clause was never classified (the old code mislabeled
// these as "confidentiality" in exports).
const CATEGORY_MAP: Record<ClassificationLabel, ClauseCategory> = {
  indemnification: "indemnification",
  limitation_of_liability: "limitation_of_liability",
  termination: "termination",
  governing_law: "governing_law",
  jurisdiction: "jurisdiction",
  data_protection_dpdp: "data_protection_dpdp",
  payment_terms: "payment_terms",
  ip_assignment: "ip_assignment",
  other: "other",
};

function num(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

function stripCiteTokens(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s*\[CITE:[^\]]+\]/gi, "").replace(/\s+\./g, ".").trim();
}

export interface BuildExportResult {
  contract: Contract;
  clauseStates: Record<string, ClauseState>;
}

// Per-level penalty weights for the overall risk score. The old formula divided
// by a `totalClauses * 6` ceiling, which implicitly assumed a contract was
// "fine" unless EVERY clause was high-risk — so even many high-risk clauses
// barely moved the needle (the IPPB MSA scored 73/100 while ~45% of its clauses
// were risky). This penalty-density model scales the penalty to the clause
// count and adds a high-risk-share amplifier so concentrated severity is
// punished. Calibrated so an IPPB-style PSU vendor MSA lands ~30-55 and a
// well-drafted balanced MSA lands ~70-85. NOTE: the denominator's correctness
// depends on the parser producing real clauses (Stage 1) — inflated clause
// counts would deflate density and inflate the score.
const HIGH_W = 10;
const MISSING_W = 6;
const MEDIUM_W = 4;
const LOW_W = 1;
const PENALTY_NORM = 7;

export function computeOverallScore(
  summary: { high: number; medium: number; low: number; missing: number },
  totalClauses: number,
): number {
  if (totalClauses === 0) return 100;
  const penalty =
    summary.high * HIGH_W +
    summary.missing * MISSING_W +
    summary.medium * MEDIUM_W +
    summary.low * LOW_W;
  const density = penalty / (totalClauses * PENALTY_NORM);
  const highShare = summary.high / totalClauses;
  const amplified = density * (1 + 0.5 * highShare);
  return Math.round(Math.max(0, Math.min(1, 1 - amplified)) * 100);
}

export function buildContractForExport(args: {
  contract: ExportContractRow;
  clauses: ExportClauseRow[];
  actions: ExportActionRow[];
  contractType?: ContractType;
}): BuildExportResult {
  const { contract, clauses, actions } = args;
  const contractType = args.contractType ?? "msa";

  const actionByClause = new Map<string, ExportActionRow>();
  for (const a of actions) actionByClause.set(a.clause_id, a);

  const summary = { high: 0, medium: 0, low: 0, standard: 0, missing: 0 };
  const clauseStates: Record<string, ClauseState> = {};

  const analysisClauses: ClauseAnalysis[] = clauses
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => {
      const action = actionByClause.get(c.id);
      if (action) clauseStates[c.id] = action.state;

      const level: RiskLevel = c.risk_level ?? "standard";
      if (level in summary) summary[level as keyof typeof summary] += 1;

      const category: ClauseCategory = c.category
        ? CATEGORY_MAP[c.category]
        : "other";
      // Honest, sanitized summary (no over-claim, no leaked engine error text).
      const summaryText = deriveClauseSummary(level, c.risk_issue);
      // Playbook rule IDs the analyzer attached, with engine sentinels removed.
      const ruleIds = displayRuleIds(c.risk_rule_ids);

      return {
        id: c.id,
        clauseNumber: c.clause_number ?? String(c.position),
        category,
        title: c.section_title || `Clause ${c.position}`,
        originalText: stripCiteTokens(c.clause_text) || c.clause_text,
        riskLevel: level,
        summary: summaryText,
        reasoning: sanitizeForExport(stripCiteTokens(c.risk_explanation)),
        suggestedRedline: stripCiteTokens(c.risk_suggestion) || undefined,
        modifiedText:
          action?.state === "modified" && action.modified_text
            ? action.modified_text
            : undefined,
        citations: Array.isArray(c.citations) ? c.citations : [],
        confidence: num(c.risk_confidence) ?? 0,
        ruleIds,
        // Derived from real data, not hardcoded: a clause "matches the playbook"
        // when it tripped no playbook rule.
        isFromPlaybook: ruleIds.length === 0,
        marketPosition: "at",
        trustScore: num(c.trust_score) ?? undefined,
        issue: sanitizeForExport(stripCiteTokens(c.risk_issue)) || undefined,
      } satisfies ClauseAnalysis;
    });

  const totalClauses = analysisClauses.length;
  const overallScore = computeOverallScore(summary, totalClauses);

  const fileSize = contract.page_count
    ? `${contract.page_count} pages`
    : contract.original_filename;

  const builtContract: Contract = {
    id: contract.id,
    title: contract.title,
    counterparty: "—",
    contractType,
    jurisdiction: "India",
    governingLaw: "Indian Contract Act, 1872",
    status: "in_progress",
    riskSummary: {
      high: summary.high,
      medium: summary.medium,
      low: summary.low,
      standard: summary.standard,
      missing: summary.missing,
      overallScore,
      escalationRecommended: summary.high > 0,
    },
    totalClauses,
    reviewedClauses: Object.keys(clauseStates).length,
    uploadedBy: "—",
    uploadedAt: new Date(),
    lastUpdated: new Date(),
    version: 1,
    fileSize,
    pageCount: contract.page_count ?? 0,
    tags: [],
    clauses: analysisClauses,
  };

  return { contract: builtContract, clauseStates };
}
