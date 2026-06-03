import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
    constructor(_cfg: { apiKey: string }) {}
  },
}));

vi.mock("server-only", () => ({}));

// RAG context is a server-only module that depends on Supabase / OpenAI; stub it.
vi.mock("./rag-context", () => ({
  getRagContext: vi.fn(async () => []),
  formatRagSnippets: () => "(none)",
}));

import { analyzeClauseRisks } from "./orchestrator";
import { _resetForTests } from "./llm-analyzer";

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;
const ORIG_CASCADE = process.env.RISK_CASCADE;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  // These tests exercise the rule/LLM MERGE logic with a single deterministic
  // model pass. The cascade (cheap-first → escalate) is covered separately in
  // orchestrator.cascade.test.ts; disable it here so call counts stay 1:1.
  process.env.RISK_CASCADE = "0";
  _resetForTests();
  createMock.mockReset();
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  if (ORIG_CASCADE === undefined) delete process.env.RISK_CASCADE;
  else process.env.RISK_CASCADE = ORIG_CASCADE;
});

// Mock Anthropic responses. The analyzer uses tool_use now, so successful
// responses must return a tool_use block with the structured input. Use
// `llmText(...)` to simulate the "model returned prose instead of calling
// the tool" failure mode.
function llmTool(input: object) {
  return {
    content: [
      { type: "tool_use", name: "submit_risk_analysis", input },
    ],
  };
}

function llmText(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("analyzeClauseRisks", () => {
  it("uncapped liability stays HIGH even when the LLM downgrades it", async () => {
    // Every substantive clause now gets a model pass (recall fix). The rule's
    // HIGH severity must still win the merge so a soft LLM opinion can never
    // bury a real risk.
    createMock.mockResolvedValueOnce(
      llmTool({
        risk_level: "low",
        issue: "Liability allocation looks standard",
        explanation: "Reads like a typical allocation of liability.",
        suggestion: "",
        confidence: 0.6,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c1",
        clauseText:
          "The Service Provider shall be liable for all damages arising under this Agreement.",
        category: "limitation_of_liability",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out).toHaveLength(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(out[0]?.riskLevel).toBe("high");
    expect(out[0]?.ruleIds).toContain("lol.uncapped");
    expect(out[0]?.explanation).toMatch(
      /\[CITE: Indian Contract Act 1872 \| s\.73 \| 1872\]/,
    );
  });

  it("DPDP category always escalates to LLM even when rules fire", async () => {
    createMock.mockResolvedValueOnce(
      llmTool({
        risk_level: "high",
        issue: "Breach notification missing",
        explanation:
          "Clause omits the 72-hour breach notification mandated by [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
        suggestion:
          "Add a 72-hour breach notice obligation to the Data Protection Board and affected Data Principals.",
        confidence: 0.9,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c2",
        clauseText:
          "The Vendor shall implement reasonable security measures to protect personal data of customers.",
        category: "data_protection_dpdp",
        classificationConfidence: 0.95,
      },
    ]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(out[0]?.riskLevel).toBe("high");
    expect(["rule_llm_agree", "llm"]).toContain(out[0]?.method);
    expect(out[0]?.explanation).toMatch(
      /\[CITE: Digital Personal Data Protection Act 2023/,
    );
  });

  it("falls back to rule-only when LLM is unavailable (no API key)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    _resetForTests();

    const out = await analyzeClauseRisks([
      {
        clauseId: "c3",
        clauseText:
          "The Vendor shall implement reasonable security measures to protect personal data.",
        category: "data_protection_dpdp",
        classificationConfidence: 0.95,
      },
    ]);

    expect(createMock).not.toHaveBeenCalled();
    expect(out[0]?.method).toBe("rule");
    expect(out[0]?.riskLevel).toBe("high");
  });

  it("merges rule findings with soft fallback when LLM repeatedly throws", async () => {
    // p-retry: initial + 2 retries = 3 attempts, all transient failures.
    createMock.mockRejectedValue(new Error("upstream timeout"));

    const out = await analyzeClauseRisks([
      {
        clauseId: "c4",
        clauseText:
          "Vendor shall process personal data as required to provide the services hereunder.",
        category: "data_protection_dpdp",
        classificationConfidence: 0.95,
      },
    ]);

    // Rule findings still survive even though the LLM blew up.
    expect(out[0]?.riskLevel).toBe("high");
    expect(out[0]?.ruleIds.length).toBeGreaterThan(0);
    // LLM_PARSE_FAILED marker lets the admin reanalyze endpoint find this row.
    expect(out[0]?.ruleIds).toContain("LLM_PARSE_FAILED");
  }, 10_000);

  it("returns soft fallback + LLM_PARSE_FAILED when model emits prose instead of calling the tool", async () => {
    // Tool use is forced server-side, but cover the defensive path anyway.
    createMock.mockResolvedValue(
      llmText("I cannot analyze this clause without more context."),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c-prose",
        clauseText:
          "Vendor shall process personal data as required to provide the services hereunder.",
        category: "data_protection_dpdp",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out[0]?.ruleIds).toContain("LLM_PARSE_FAILED");
    // Rule-derived high finding still wins on severity merge.
    expect(out[0]?.riskLevel).toBe("high");
  });

  it("short clauses get standard fallback without LLM call", async () => {
    const out = await analyzeClauseRisks([
      {
        clauseId: "c5",
        clauseText: "See above.",
        category: "indemnification",
        classificationConfidence: 0.95,
      },
    ]);
    expect(out[0]?.riskLevel).toBe("standard");
    expect(out[0]?.method).toBe("rule");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("non-substantive clauses (template comments, page markers) are tagged NON_SUBSTANTIVE without LLM call", async () => {
    const out = await analyzeClauseRisks([
      {
        clauseId: "c-template",
        clauseText:
          "** This is only Mercy Corps' standard template for master service agreement contract. Some terms might be added or removed based on the nature of the provided service and its value.",
        category: "other",
        classificationConfidence: 0.5,
      },
      {
        clauseId: "c-page-marker",
        clauseText: "PAGE 1 of 11",
        category: "other",
        classificationConfidence: 0.5,
      },
    ]);

    expect(out[0]?.riskLevel).toBe("standard");
    expect(out[0]?.ruleIds).toContain("NON_SUBSTANTIVE");
    expect(out[0]?.issue).toBe("");
    expect(out[0]?.explanation).toBe("");
    // The short page marker is filtered before the analyzer too; neither clause
    // reaches the LLM.
    expect(createMock).not.toHaveBeenCalled();
  });

  it("respects maxLlmCalls cap", async () => {
    createMock.mockImplementation(async () =>
      llmTool({
        risk_level: "medium",
        issue: "needs review",
        explanation:
          "Clause may breach DPDP norms [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
        suggestion: "",
        confidence: 0.7,
      }),
    );

    // Distinct texts so within-contract dedup keeps them as 5 separate units —
    // this test is about the call-budget cap, not dedup.
    const inputs = Array.from({ length: 5 }, (_, i) => ({
      clauseId: `c-${i}`,
      clauseText: `Clause ${i}: the Vendor shall implement reasonable security measures to protect personal data of customers in region ${i}.`,
      category: "data_protection_dpdp" as const,
      classificationConfidence: 0.9,
    }));

    const out = await analyzeClauseRisks(inputs, {
      maxLlmCalls: 2,
      concurrency: 1,
    });
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(5);
    // The 3 skipped should still have rule-derived findings (DPDP rules fire).
    const skippedMethods = out.slice(2).map((r) => r.method);
    expect(skippedMethods.every((m) => m === "rule")).toBe(true);
  });

  it("suppresses a generic termination redline on an unrelated (confidentiality) clause", async () => {
    // term.no_notice fires on any termination-category clause lacking notice
    // language — even a misclassified confidentiality clause. With an empty LLM
    // suggestion, the generic "thirty (30) days' notice" template must NOT leak.
    createMock.mockResolvedValueOnce(
      llmTool({
        risk_level: "medium",
        issue: "Broad confidentiality obligation",
        explanation:
          "The confidentiality obligation is broad. [CITE: Indian Contract Act 1872 | s.73 | 1872]",
        suggestion: "",
        confidence: 0.6,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c-conf",
        clauseText:
          "Each Party shall keep the other Party's Confidential Information strictly secret and shall not disclose it to any third party.",
        category: "termination",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out[0]?.ruleIds).toContain("term.no_notice");
    expect(out[0]?.suggestion).toBe("");
  });

  it("keeps the termination redline when the clause is actually about termination", async () => {
    createMock.mockResolvedValueOnce(
      llmTool({
        risk_level: "medium",
        issue: "No notice period",
        explanation:
          "Termination without notice. [CITE: Indian Contract Act 1872 | s.73 | 1872]",
        suggestion: "",
        confidence: 0.6,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c-term",
        clauseText:
          "Either Party may terminate this Agreement and the termination shall take immediate effect.",
        category: "termination",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out[0]?.suggestion).toMatch(/thirty \(30\) days/);
  });

  it("always prefers the LLM's contextual redline over the rule template", async () => {
    createMock.mockResolvedValueOnce(
      llmTool({
        risk_level: "medium",
        issue: "x",
        explanation: "y [CITE: Indian Contract Act 1872 | s.73 | 1872]",
        suggestion: "Narrow the confidentiality carve-outs to exclude residuals.",
        confidence: 0.7,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c-llm",
        clauseText:
          "Each Party shall keep Confidential Information secret and not disclose it to third parties.",
        category: "termination",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out[0]?.suggestion).toBe(
      "Narrow the confidentiality carve-outs to exclude residuals.",
    );
  });

  it("backfills [CITE: …] when LLM omits citations on a high-severity finding", async () => {
    createMock.mockResolvedValueOnce(
      llmTool({
        risk_level: "high",
        issue: "Breach notification missing",
        explanation:
          "The clause does not specify a breach notification timeline.",
        suggestion: "Add a 72-hour notification.",
        confidence: 0.85,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c6",
        clauseText:
          "The Vendor shall implement reasonable security measures to protect personal data of customers.",
        category: "data_protection_dpdp",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out[0]?.riskLevel).toBe("high");
    expect(out[0]?.explanation).toMatch(
      /\[CITE: Digital Personal Data Protection Act 2023/,
    );
  });
});
