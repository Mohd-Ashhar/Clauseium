import type { RiskLevel } from "@/types/contract";
import type { ClassificationLabel } from "@/lib/classification/categories";

export type { RiskLevel } from "@/types/contract";

export type RiskMethod = "rule" | "llm" | "rule_llm_agree";

export interface AnalyzeRiskInput {
  clauseId: string;
  clauseText: string;
  category: ClassificationLabel;
  classificationConfidence: number;
}

export interface RuleCtx {
  clauseId: string;
  clauseText: string;
  lower: string;
  category: ClassificationLabel;
}

export interface RuleFinding {
  ruleId: string;
  level: RiskLevel;
  issue: string;
  explanation: string;
  suggestion: string;
  citationHints: string[];
  confidence: number;
  needsLlm?: boolean;
}

export type RuleFn = (ctx: RuleCtx) => RuleFinding | null;

export interface RiskAnalysisResult {
  clauseId: string;
  riskLevel: RiskLevel;
  issue: string;
  explanation: string;
  suggestion: string;
  confidence: number;
  method: RiskMethod;
  ruleIds: string[];
}

export interface ClauseRiskRow {
  id: string;
  risk_level: RiskLevel | null;
  risk_issue: string | null;
  risk_explanation: string | null;
  risk_suggestion: string | null;
  risk_confidence: number | null;
  risk_method: RiskMethod | null;
  risk_rule_ids: string[];
  risk_analyzed_at: string | null;
}
