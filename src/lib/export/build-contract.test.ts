import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeOverallScore, buildContractForExport } from "./build-contract";
import type { ExportClauseRow } from "./build-contract";

describe("computeOverallScore", () => {
  it("scores an IPPB-style risky MSA (11 high / 16 medium of 58) in the 30-55 band", () => {
    const s = computeOverallScore({ high: 11, medium: 16, low: 0, missing: 0 }, 58);
    expect(s).toBeGreaterThanOrEqual(30);
    expect(s).toBeLessThanOrEqual(55);
  });

  it("scores the report's 10 high / 31 medium distribution in the 30-55 band", () => {
    const s = computeOverallScore({ high: 10, medium: 31, low: 0, missing: 0 }, 58);
    expect(s).toBeGreaterThanOrEqual(30);
    expect(s).toBeLessThanOrEqual(55);
  });

  it("scores a balanced well-drafted MSA (2 high / 9 medium / 4 low) in the 70-85 band", () => {
    const s = computeOverallScore({ high: 2, medium: 9, low: 4, missing: 0 }, 58);
    expect(s).toBeGreaterThanOrEqual(70);
    expect(s).toBeLessThanOrEqual(85);
  });

  it("is monotonic: upgrading a medium to high can only lower the score", () => {
    const a = computeOverallScore({ high: 5, medium: 10, low: 0, missing: 0 }, 58);
    const b = computeOverallScore({ high: 6, medium: 9, low: 0, missing: 0 }, 58);
    expect(b).toBeLessThan(a);
  });

  it("clamps to [0,100]", () => {
    expect(computeOverallScore({ high: 58, medium: 0, low: 0, missing: 0 }, 58)).toBeGreaterThanOrEqual(0);
    expect(computeOverallScore({ high: 0, medium: 0, low: 0, missing: 0 }, 58)).toBe(100);
    expect(computeOverallScore({ high: 0, medium: 0, low: 0, missing: 0 }, 0)).toBe(100);
  });
});

function makeClauses(
  counts: { high?: number; medium?: number; low?: number },
  total: number,
): ExportClauseRow[] {
  const rows: ExportClauseRow[] = [];
  let pos = 0;
  const push = (level: ExportClauseRow["risk_level"]) => {
    rows.push({
      id: `c${pos}`,
      position: pos,
      clause_text: `Clause ${pos} has some sufficiently long body text for analysis.`,
      section_title: `Clause ${pos}`,
      clause_number: String(pos + 1),
      category: "other",
      risk_level: level,
      risk_issue: null,
      risk_explanation: null,
      risk_suggestion: null,
      risk_confidence: 0.8,
      risk_rule_ids: null,
      citations: [],
      trust_score: 0.8,
    });
    pos += 1;
  };
  for (let i = 0; i < (counts.high ?? 0); i += 1) push("high");
  for (let i = 0; i < (counts.medium ?? 0); i += 1) push("medium");
  for (let i = 0; i < (counts.low ?? 0); i += 1) push("low");
  while (pos < total) push("standard");
  return rows;
}

describe("buildContractForExport overall score", () => {
  it("flows the recalibrated score into riskSummary and flags escalation when high risks exist", () => {
    const { contract } = buildContractForExport({
      contract: { id: "x", title: "IPPB MSA", page_count: 58, original_filename: "f.pdf" },
      clauses: makeClauses({ high: 11, medium: 16 }, 58),
      actions: [],
    });
    expect(contract.riskSummary.overallScore).toBeGreaterThanOrEqual(30);
    expect(contract.riskSummary.overallScore).toBeLessThanOrEqual(55);
    expect(contract.riskSummary.escalationRecommended).toBe(true);
  });
});

function oneClause(over: Partial<ExportClauseRow>): ExportClauseRow {
  return {
    id: "c1",
    position: 0,
    clause_text: "The parties agree to the following terms and conditions herein.",
    section_title: "Term",
    clause_number: "1",
    category: "other",
    risk_level: "standard",
    risk_issue: null,
    risk_explanation: null,
    risk_suggestion: null,
    risk_confidence: 0.8,
    risk_rule_ids: null,
    citations: [],
    trust_score: 0.8,
    ...over,
  };
}

function build(over: Partial<ExportClauseRow>) {
  const { contract } = buildContractForExport({
    contract: { id: "x", title: "T", page_count: 1, original_filename: "f.docx" },
    clauses: [oneClause(over)],
    actions: [],
  });
  return (contract.clauses ?? [])[0];
}

describe("buildContractForExport — export parity", () => {
  it("uses honest market-standard copy for standard/low clauses (no benchmark over-claim)", () => {
    const clause = build({ risk_level: "standard", risk_issue: null });
    expect(clause.summary).not.toMatch(/benchmark corpus/i);
    expect(clause.summary).toMatch(/market-standard drafting and our review playbook/i);
  });

  it("scrubs leaked engine error jargon out of the summary and reasoning", () => {
    const clause = build({
      risk_level: "standard",
      risk_issue: "Risk analyzer returned an unparseable response",
      risk_explanation: "The legal analysis model produced an invalid result",
    });
    expect(clause.summary).not.toMatch(/unparseable|analyzer returned/i);
    expect(clause.summary).toMatch(/inconclusive/i);
    expect(clause.reasoning).not.toMatch(/legal analysis model|unparseable/i);
    expect(clause.reasoning).toMatch(/inconclusive/i);
  });

  it("surfaces playbook rule ids and filters the internal LLM_PARSE_FAILED sentinel", () => {
    const clause = build({
      risk_level: "high",
      risk_rule_ids: ["term.no_notice", "LLM_PARSE_FAILED", "lol.uncapped"],
    });
    expect(clause.ruleIds).toEqual(["term.no_notice", "lol.uncapped"]);
    expect(clause.isFromPlaybook).toBe(false);
  });

  it("marks a clause that tripped no rule as from-playbook", () => {
    const clause = build({ risk_level: "standard", risk_rule_ids: [] });
    expect(clause.ruleIds).toEqual([]);
    expect(clause.isFromPlaybook).toBe(true);
  });
});
