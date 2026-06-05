import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();
const ragMock = vi.fn(async () => []);

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
    constructor(_cfg: { apiKey: string }) {}
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("./rag-context", () => ({
  getRagContext: (...args: unknown[]) => ragMock(...(args as [])),
  formatRagSnippets: () => "(none)",
}));

import { analyzeClauseRisks } from "./orchestrator";
import { riskCacheKey, type RiskCache, type CachedRisk } from "./cache";
import {
  _resetForTests,
  RISK_MODEL_DEFAULT,
  RISK_MODEL_ESCALATION,
} from "./llm-analyzer";

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;
const ORIG_CASCADE = process.env.RISK_CASCADE;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.RISK_CASCADE; // default ON
  _resetForTests();
  createMock.mockReset();
  ragMock.mockClear();
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

// A high-stakes-category clause with no risky language, so escalation is driven
// purely by the cheap pass result (no rule finding interferes).
const HIGH_STAKES_BENIGN = {
  clauseId: "c1",
  clauseText:
    "The Provider shall perform the services described herein in a professional and workmanlike manner consistent with prevailing industry standards.",
  category: "ip_assignment" as const,
  classificationConfidence: 0.95,
};

function modelOf(callIndex: number): string {
  return createMock.mock.calls[callIndex]?.[0]?.model as string;
}

describe("risk cascade", () => {
  it("does NOT escalate a high-stakes clause the cheap pass rates confidently standard", async () => {
    createMock.mockResolvedValueOnce(
      tool({
        risk_level: "standard",
        issue: "Looks standard",
        explanation: "No material deviation from norms.",
        suggestion: "",
        confidence: 0.9,
      }),
    );

    const out = await analyzeClauseRisks([HIGH_STAKES_BENIGN]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(modelOf(0)).toBe(RISK_MODEL_DEFAULT); // cheap model only
    expect(out[0]?.riskLevel).toBe("standard");
  });

  it("escalates to the strong model when the cheap pass finds medium/high risk", async () => {
    createMock
      .mockResolvedValueOnce(
        tool({
          risk_level: "medium",
          issue: "Possible exposure",
          explanation: "Some exposure worth a closer look.",
          suggestion: "",
          confidence: 0.8,
        }),
      )
      .mockResolvedValueOnce(
        tool({
          risk_level: "high",
          issue: "Material exposure",
          explanation: "On deeper review this is a material risk.",
          suggestion: "Add a cap.",
          confidence: 0.92,
        }),
      );

    const out = await analyzeClauseRisks([HIGH_STAKES_BENIGN]);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(modelOf(0)).toBe(RISK_MODEL_DEFAULT);
    expect(modelOf(1)).toBe(RISK_MODEL_ESCALATION); // escalated
    expect(out[0]?.riskLevel).toBe("high"); // strong model's verdict wins
    // RAG context fetched ONCE and reused across both passes.
    expect(ragMock).toHaveBeenCalledTimes(1);
  });

  it("escalates when the cheap pass is standard but LOW confidence", async () => {
    createMock
      .mockResolvedValueOnce(
        tool({
          risk_level: "standard",
          issue: "Unsure",
          explanation: "Hard to assess from the text.",
          suggestion: "",
          confidence: 0.5, // < 0.75 default threshold
        }),
      )
      .mockResolvedValueOnce(
        tool({
          risk_level: "low",
          issue: "Minor",
          explanation: "On review, low risk.",
          suggestion: "",
          confidence: 0.88,
        }),
      );

    await analyzeClauseRisks([HIGH_STAKES_BENIGN]);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(modelOf(1)).toBe(RISK_MODEL_ESCALATION);
  });

  it("never escalates a NON-high-stakes clause — single cheap pass even if risky", async () => {
    createMock.mockResolvedValueOnce(
      tool({
        risk_level: "medium",
        issue: "Worth noting",
        explanation: "Medium risk in an ordinary clause.",
        suggestion: "",
        confidence: 0.8,
      }),
    );

    const out = await analyzeClauseRisks([
      {
        clauseId: "c-other",
        clauseText:
          "The Provider shall deliver monthly status reports summarising progress against the agreed roadmap.",
        category: "other",
        classificationConfidence: 0.95,
      },
    ]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(modelOf(0)).toBe(RISK_MODEL_DEFAULT);
    expect(out[0]?.riskLevel).toBe("medium");
  });

  it("with RISK_CASCADE=0, a high-stakes clause goes straight to the strong model (one pass)", async () => {
    process.env.RISK_CASCADE = "0";
    createMock.mockResolvedValueOnce(
      tool({
        risk_level: "standard",
        issue: "ok",
        explanation: "fine",
        suggestion: "",
        confidence: 0.9,
      }),
    );

    await analyzeClauseRisks([HIGH_STAKES_BENIGN]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(modelOf(0)).toBe(RISK_MODEL_ESCALATION); // no cheap pre-pass
  });
});

describe("risk cache (cross-contract)", () => {
  const CL = {
    clauseId: "x1",
    clauseText:
      "The Provider shall deliver monthly status reports summarising progress against the roadmap.",
    category: "other" as const,
    classificationConfidence: 0.95,
  };

  it("a cache HIT reuses the prior analysis with no LLM call", async () => {
    const key = riskCacheKey(CL.clauseText, CL.category);
    const hit: CachedRisk = {
      riskLevel: "medium",
      issue: "Cached issue",
      explanation: "Cached explanation.",
      suggestion: "",
      confidence: 0.7,
      method: "llm",
      ruleIds: [],
    };
    const cache: RiskCache = {
      get: async () => new Map([[key, hit]]),
      set: async () => {},
    };

    const out = await analyzeClauseRisks([CL], { cache });

    expect(createMock).not.toHaveBeenCalled(); // served from cache
    expect(out[0]?.riskLevel).toBe("medium");
    expect(out[0]?.issue).toBe("Cached issue");
    expect(out[0]?.clauseId).toBe("x1"); // re-attached to the asking clause
  });

  it("a cache MISS analyzes once and writes the result back", async () => {
    createMock.mockResolvedValueOnce(
      tool({
        risk_level: "high",
        issue: "Real issue",
        explanation: "Real explanation.",
        suggestion: "Fix it.",
        confidence: 0.85,
      }),
    );
    let writeCount = 0;
    let writtenKey = "";
    const cache: RiskCache = {
      get: async () => new Map(),
      set: async (entries) => {
        writeCount += entries.length;
        writtenKey = entries[0]?.key ?? "";
      },
    };

    const out = await analyzeClauseRisks([CL], { cache });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(out[0]?.riskLevel).toBe("high");
    expect(writeCount).toBe(1);
    expect(writtenKey).toBe(riskCacheKey(CL.clauseText, CL.category));
  });
});

describe("risk dedup", () => {
  it("analyzes identical clauses once and broadcasts the result to each id", async () => {
    createMock.mockResolvedValue(
      tool({
        risk_level: "medium",
        issue: "Boilerplate concern",
        explanation: "Repeated clause, single analysis.",
        suggestion: "",
        confidence: 0.8,
      }),
    );

    const text =
      "The Provider shall deliver monthly status reports summarising progress against the roadmap.";
    const out = await analyzeClauseRisks([
      { clauseId: "a", clauseText: text, category: "other", classificationConfidence: 0.95 },
      { clauseId: "b", clauseText: text, category: "other", classificationConfidence: 0.95 },
      { clauseId: "c", clauseText: text, category: "other", classificationConfidence: 0.95 },
    ]);

    // One model call for three identical clauses.
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(out).toHaveLength(3);
    expect(out.map((r) => r?.clauseId)).toEqual(["a", "b", "c"]);
    expect(out.every((r) => r?.riskLevel === "medium")).toBe(true);
  });
});
