import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();
const runRiskBatchMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
    constructor(_cfg: { apiKey: string }) {}
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("./rag-context", () => ({
  getRagContext: vi.fn(async () => []),
  formatRagSnippets: () => "(none)",
}));
// Control the batch layer directly so we can assert the orchestrator applies
// batch outcomes and real-times whatever the batch didn't return.
vi.mock("./batch", () => ({
  isBatchEnabled: () => true,
  runRiskBatch: (...args: unknown[]) => runRiskBatchMock(...args),
}));

import { analyzeClauseRisks } from "./orchestrator";
import { riskCacheKey } from "./cache";
import { _resetForTests } from "./llm-analyzer";

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;
const ORIG_CASCADE = process.env.RISK_CASCADE;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  // Single-pass real-time fallback so createMock counts are 1:1 with clauses
  // (the cascade's cheap→escalate is covered separately).
  process.env.RISK_CASCADE = "0";
  _resetForTests();
  createMock.mockReset();
  runRiskBatchMock.mockReset();
});
afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  if (ORIG_CASCADE === undefined) delete process.env.RISK_CASCADE;
  else process.env.RISK_CASCADE = ORIG_CASCADE;
});

function tool(input: object) {
  return { content: [{ type: "tool_use", name: "submit_risk_analysis", input }] };
}

// Rule-free "other" clauses so the analyzer's response flows through the merge
// unchanged (no rule finding overrides the issue) — lets us assert sourcing.
const A = {
  clauseId: "a",
  clauseText: "The Provider shall deliver the monthly report in the format specified by the Company from time to time.",
  category: "other" as const,
  classificationConfidence: 0.9,
};
const B = {
  clauseId: "b",
  clauseText: "The Company may review the Provider's records upon reasonable prior notice during business hours.",
  category: "other" as const,
  classificationConfidence: 0.9,
};

describe("analyzeClauseRisks — batch path", () => {
  it("applies batch outcomes and real-times only what the batch didn't return", async () => {
    // Batch handles clause A; B is absent → must fall back to real-time.
    runRiskBatchMock.mockImplementation(async () => {
      const keyA = riskCacheKey(A.clauseText, A.category);
      return new Map([
        [
          keyA,
          {
            response: {
              risk_level: "high",
              issue: "Batch: uncapped liability",
              explanation: "From batch. [CITE: Indian Contract Act 1872 | s.73 | 1872]",
              suggestion: "Cap it.",
              confidence: 0.82,
            },
            model: "claude-sonnet-4-6",
          },
        ],
      ]);
    });
    // Real-time analyzer (used only for B).
    createMock.mockResolvedValue(
      tool({
        risk_level: "medium",
        issue: "Real-time: no notice",
        explanation: "From real-time. [CITE: Indian Contract Act 1872 | s.73 | 1872]",
        suggestion: "",
        confidence: 0.6,
      }),
    );

    const out = await analyzeClauseRisks([A, B], { concurrency: 1 });

    expect(runRiskBatchMock).toHaveBeenCalledTimes(1);
    // B (and only B) went to the real-time analyzer.
    expect(createMock).toHaveBeenCalledTimes(1);

    const a = out.find((r) => r.clauseId === "a");
    const b = out.find((r) => r.clauseId === "b");
    expect(a?.issue).toBe("Batch: uncapped liability"); // from batch
    expect(b?.issue).toBe("Real-time: no notice"); // from real-time fallback
    expect(out).toHaveLength(2);
  });

  it("falls back entirely to real-time when the batch returns nothing", async () => {
    runRiskBatchMock.mockResolvedValue(new Map());
    createMock.mockResolvedValue(
      tool({
        risk_level: "high",
        issue: "rt",
        explanation: "x [CITE: Indian Contract Act 1872 | s.73 | 1872]",
        suggestion: "",
        confidence: 0.7,
      }),
    );

    const out = await analyzeClauseRisks([A, B], { concurrency: 1 });

    expect(createMock).toHaveBeenCalledTimes(2); // both real-timed
    expect(out).toHaveLength(2);
  });
});
