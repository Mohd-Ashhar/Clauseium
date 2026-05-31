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
      const cleanIssue = stripCiteTokens(c.risk_issue);
      const summaryText =
        cleanIssue ||
        (level === "missing"
          ? "Required clause not present in this contract."
          : level === "standard" || level === "low"
            ? "Matches our playbook and the Indian commercial benchmark corpus."
            : "Material risk identified for reviewer attention.");

      return {
        id: c.id,
        clauseNumber: c.clause_number ?? String(c.position),
        category,
        title: c.section_title || `Clause ${c.position}`,
        originalText: stripCiteTokens(c.clause_text) || c.clause_text,
        riskLevel: level,
        summary: summaryText,
        reasoning: stripCiteTokens(c.risk_explanation),
        suggestedRedline: stripCiteTokens(c.risk_suggestion) || undefined,
        modifiedText:
          action?.state === "modified" && action.modified_text
            ? action.modified_text
            : undefined,
        citations: Array.isArray(c.citations) ? c.citations : [],
        confidence: num(c.risk_confidence) ?? 0,
        isFromPlaybook: false,
        marketPosition: "at",
        trustScore: num(c.trust_score) ?? undefined,
        issue: cleanIssue || undefined,
      } satisfies ClauseAnalysis;
    });

  const totalClauses = analysisClauses.length;
  const risky = summary.high * 6 + summary.medium * 2 + summary.missing * 3;
  const ceiling = totalClauses * 6;
  const overallScore =
    ceiling === 0 ? 100 : Math.round((1 - Math.min(1, risky / ceiling)) * 100);

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
