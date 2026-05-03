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

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  _resetForTests();
  createMock.mockReset();
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
});

function llmText(json: object) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

describe("analyzeClauseRisks", () => {
  it("rule-only path: uncapped liability is HIGH without LLM call", async () => {
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
    expect(out[0].riskLevel).toBe("high");
    expect(out[0].method).toBe("rule");
    expect(out[0].ruleIds).toContain("lol.uncapped");
    expect(out[0].explanation).toMatch(/\[CITE: Indian Contract Act 1872 \| s\.73 \| 1872\]/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("DPDP category always escalates to LLM even when rules fire", async () => {
    createMock.mockResolvedValueOnce(
      llmText({
        risk_level: "high",
        issue: "Breach notification missing",
        explanation:
          "Clause omits the 72-hour breach notification mandated by [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
        suggestion: "Add a 72-hour breach notice obligation to the Data Protection Board and affected Data Principals.",
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
    expect(out[0].riskLevel).toBe("high");
    expect(["rule_llm_agree", "llm"]).toContain(out[0].method);
    expect(out[0].explanation).toMatch(/\[CITE: Digital Personal Data Protection Act 2023/);
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
    expect(out[0].method).toBe("rule");
    expect(out[0].riskLevel).toBe("high");
  });

  it("falls back to rule-only when LLM throws", async () => {
    createMock.mockRejectedValueOnce(new Error("timeout"));

    const out = await analyzeClauseRisks([
      {
        clauseId: "c4",
        clauseText:
          "Vendor shall process personal data as required to provide the services hereunder.",
        category: "data_protection_dpdp",
        classificationConfidence: 0.95,
      },
    ]);

    expect(out[0].method).toBe("rule");
    expect(out[0].ruleIds.length).toBeGreaterThan(0);
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
    expect(out[0].riskLevel).toBe("standard");
    expect(out[0].method).toBe("rule");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("respects maxLlmCalls cap", async () => {
    createMock.mockImplementation(async () =>
      llmText({
        risk_level: "medium",
        issue: "needs review",
        explanation:
          "Clause may breach DPDP norms [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
        suggestion: "",
        confidence: 0.7,
      }),
    );

    const inputs = Array.from({ length: 5 }, (_, i) => ({
      clauseId: `c-${i}`,
      clauseText:
        "The Vendor shall implement reasonable security measures to protect personal data of customers.",
      category: "data_protection_dpdp" as const,
      classificationConfidence: 0.9,
    }));

    const out = await analyzeClauseRisks(inputs, { maxLlmCalls: 2, concurrency: 1 });
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(5);
    // The 3 skipped should still have rule-derived findings (DPDP rules fire).
    const skippedMethods = out.slice(2).map((r) => r.method);
    expect(skippedMethods.every((m) => m === "rule")).toBe(true);
  });

  it("backfills [CITE: …] when LLM omits citations on a high-severity finding", async () => {
    createMock.mockResolvedValueOnce(
      llmText({
        risk_level: "high",
        issue: "Breach notification missing",
        explanation: "The clause does not specify a breach notification timeline.",
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

    expect(out[0].riskLevel).toBe("high");
    expect(out[0].explanation).toMatch(/\[CITE: Digital Personal Data Protection Act 2023/);
  });
});
