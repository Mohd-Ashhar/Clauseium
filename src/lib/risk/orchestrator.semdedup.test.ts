import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();
const embedMock = vi.fn();

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
vi.mock("@/lib/rag/embed", () => ({
  embedBatch: (...args: unknown[]) => embedMock(...args),
}));

import { analyzeClauseRisks } from "./orchestrator";
import { _resetForTests } from "./llm-analyzer";

const SAVED = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RISK_CASCADE: process.env.RISK_CASCADE,
  RISK_USE_BATCH: process.env.RISK_USE_BATCH,
  RISK_SEMDEDUP: process.env.RISK_SEMDEDUP,
};

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.OPENAI_API_KEY = "test-openai";
  process.env.RISK_CASCADE = "0"; // single pass → 1 call per analyzed group
  process.env.RISK_USE_BATCH = "0"; // keep everything real-time
  process.env.RISK_SEMDEDUP = "1"; // enable the feature under test
  _resetForTests();
  createMock.mockReset();
  embedMock.mockReset();
  createMock.mockResolvedValue({
    content: [
      {
        type: "tool_use",
        name: "submit_risk_analysis",
        input: {
          risk_level: "medium",
          issue: "Shared issue",
          explanation: "x [CITE: Indian Contract Act 1872 | s.73 | 1872]",
          suggestion: "",
          confidence: 0.8,
        },
      },
    ],
  });
});
afterEach(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

// Two 'other' clauses with DIFFERENT exact text (so exact-dedup keeps them as two
// groups) — the only thing that merges them is semantic similarity.
const A = {
  clauseId: "a",
  clauseText: "The Provider shall deliver the monthly status report in the agreed format.",
  category: "other" as const,
  classificationConfidence: 0.9,
};
const B = {
  clauseId: "b",
  clauseText: "Provider delivers monthly status reports in the format agreed by the parties.",
  category: "other" as const,
  classificationConfidence: 0.9,
};

describe("analyzeClauseRisks — semantic dedup", () => {
  it("collapses near-identical clauses into ONE analysis, broadcast to each id", async () => {
    embedMock.mockResolvedValue([
      [1, 0, 0],
      [1, 0, 0],
    ]); // identical → merge
    const out = await analyzeClauseRisks([A, B], { concurrency: 1 });

    expect(createMock).toHaveBeenCalledTimes(1); // analyzed once
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.clauseId === "a")?.issue).toBe("Shared issue");
    expect(out.find((r) => r.clauseId === "b")?.issue).toBe("Shared issue");
  });

  it("does NOT collapse dissimilar clauses (two analyses)", async () => {
    embedMock.mockResolvedValue([
      [1, 0, 0],
      [0, 1, 0],
    ]); // orthogonal → no merge
    const out = await analyzeClauseRisks([A, B], { concurrency: 1 });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(2);
  });

  it("degrades to exact-dedup only when embedding fails (no clause lost)", async () => {
    embedMock.mockRejectedValue(new Error("embeddings down"));
    const out = await analyzeClauseRisks([A, B], { concurrency: 1 });

    expect(createMock).toHaveBeenCalledTimes(2); // both analyzed (no merge)
    expect(out).toHaveLength(2);
  });
});
