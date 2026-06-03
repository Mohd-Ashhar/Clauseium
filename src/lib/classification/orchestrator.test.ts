import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture the create() spy so individual tests can configure it.
const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = { create: createMock };
      constructor(_cfg: { apiKey: string }) {}
    },
  };
});

// server-only stub so the module can be imported in test env.
vi.mock("server-only", () => ({}));

import { classifyClauses } from "./orchestrator";
import { _resetForTests } from "./llm-classifier";

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
  return {
    content: [{ type: "text", text: JSON.stringify(json) }],
  };
}

describe("classifyClauses", () => {
  it("classifies high-confidence clauses with method=rule (no LLM call)", async () => {
    const results = await classifyClauses([
      {
        id: "c1",
        text: "In no event shall the aggregate liability of either Party exceed the fees paid in the preceding twelve months.",
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      clauseId: "c1",
      category: "limitation_of_liability",
      method: "rule",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falls back to LLM when rules are ambiguous; agreement with rule top → rule_llm_agree", async () => {
    // Both governing_law and jurisdiction fire as strong → tie → LLM. With ties,
    // governing_law wins as rule top (declared first in CLASSIFICATION_CATEGORIES).
    // LLM agreeing with the rule top → rule_llm_agree.
    createMock.mockResolvedValueOnce(
      llmText({ category: "governing_law", confidence: 0.9, reasoning: "primary effect is choice of law" }),
    );

    const results = await classifyClauses([
      {
        id: "c2",
        text: "This Agreement shall be governed by the laws of India and the courts at Mumbai shall have exclusive jurisdiction.",
      },
    ]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(results[0].category).toBe("governing_law");
    expect(results[0].method).toBe("rule_llm_agree");
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("LLM disagreeing with rule top → method=llm", async () => {
    // Rule top will be governing_law (declared first on tie); LLM picks jurisdiction.
    createMock.mockResolvedValueOnce(
      llmText({ category: "jurisdiction", confidence: 0.85, reasoning: "operative term names courts at Mumbai" }),
    );

    const results = await classifyClauses([
      {
        id: "c3",
        text: "This Agreement is governed by the laws of India and the courts at Mumbai shall have exclusive jurisdiction.",
      },
    ]);

    expect(results[0].category).toBe("jurisdiction");
    expect(results[0].method).toBe("llm");
  });

  it("LLM returning 'other' caps confidence at 0.5", async () => {
    createMock.mockResolvedValueOnce(
      llmText({ category: "other", confidence: 0.9, reasoning: "boilerplate" }),
    );

    const results = await classifyClauses([
      {
        id: "c4",
        text: "The Parties shall cooperate in good faith to resolve any operational matters that may arise from time to time.",
      },
    ]);

    expect(results[0].category).toBe("other");
    expect(results[0].method).toBe("llm");
    expect(results[0].confidence).toBeLessThanOrEqual(0.5);
  });

  it("short clauses (<40 chars) bypass classification entirely", async () => {
    const results = await classifyClauses([{ id: "c5", text: "See above." }]);
    expect(results[0].category).toBe("other");
    expect(results[0].method).toBe("rule");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("falls back to rule top if LLM throws", async () => {
    createMock.mockRejectedValueOnce(new Error("timeout"));

    const results = await classifyClauses([
      {
        id: "c6",
        text: "This obligation shall survive the expiration of the Agreement.",
      },
    ]);

    expect(results[0].category).toBe("termination");
    expect(results[0].method).toBe("rule");
    expect(results[0].confidence).toBeLessThanOrEqual(0.5);
  });

  it("when API key is missing, runs in rule-only mode (no LLM call, no throw)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    _resetForTests();

    const results = await classifyClauses([
      {
        id: "c7",
        text: "This Agreement shall be governed by the laws of India and the courts at Mumbai shall have exclusive jurisdiction.",
      },
    ]);

    expect(createMock).not.toHaveBeenCalled();
    expect(results[0].method).toBe("rule");
  });

  it("respects maxLlmCalls cap", async () => {
    createMock.mockImplementation(async () =>
      llmText({ category: "other", confidence: 0.5, reasoning: "" }),
    );

    // Distinct texts so within-contract dedup keeps them as 5 separate units —
    // this test is about the call-budget cap, not dedup.
    const inputs = Array.from({ length: 5 }, (_, i) => ({
      id: `c-${i}`,
      text: `Item ${i}: the parties shall cooperate in good faith on matters arising from time to time under section ${i}.`,
    }));

    const results = await classifyClauses(inputs, { maxLlmCalls: 2, concurrency: 1 });
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(5);
  });

  it("classifies identical clauses once and broadcasts the result to each id", async () => {
    createMock.mockResolvedValue(
      llmText({ category: "other", confidence: 0.5, reasoning: "" }),
    );

    const text = "The parties shall cooperate in good faith on matters arising from time to time.";
    const results = await classifyClauses([
      { id: "a", text },
      { id: "b", text },
      { id: "c", text },
    ]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.clauseId)).toEqual(["a", "b", "c"]);
    expect(results.every((r) => r.category === "other")).toBe(true);
  });
});
