import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { runRiskBatch, type BatchItem } from "./batch";
import type { RiskBatchClient } from "./llm-analyzer";

function toolMessage(input: object) {
  return { content: [{ type: "tool_use", name: "submit_risk_analysis", input }] };
}

const VALID = {
  risk_level: "high",
  issue: "Uncapped liability",
  explanation: "No cap. [CITE: Indian Contract Act 1872 | s.73 | 1872]",
  suggestion: "Add a cap.",
  confidence: 0.8,
};

function mockClient(opts: {
  statuses: string[]; // processing_status returned by create then each retrieve
  results?: Array<{ custom_id: string; result: { type: string; message?: unknown } }>;
  onCancel?: () => void;
}): RiskBatchClient {
  let i = 0;
  return {
    messages: {
      batches: {
        create: async () => ({ id: "batch_1", processing_status: opts.statuses[0] }),
        retrieve: async () => ({
          id: "batch_1",
          processing_status: opts.statuses[Math.min(++i, opts.statuses.length - 1)],
        }),
        results: async () =>
          (async function* () {
            for (const r of opts.results ?? []) yield r;
          })(),
        cancel: async () => {
          opts.onCancel?.();
          return {};
        },
      },
    },
  };
}

const items: BatchItem[] = [
  {
    customId: "k1",
    input: {
      clauseId: "c1",
      category: "limitation_of_liability",
      clauseText: "The provider shall be liable without any cap whatsoever.",
      ruleFindings: [],
      ragContext: [],
      classificationConfidence: 0.9,
    },
  },
];

describe("runRiskBatch", () => {
  it("returns parsed outcomes for succeeded requests", async () => {
    const client = mockClient({
      statuses: ["ended"],
      results: [{ custom_id: "k1", result: { type: "succeeded", message: toolMessage(VALID) } }],
    });
    const out = await runRiskBatch(items, { client, pollMs: 1 });
    expect(out.get("k1")?.response.risk_level).toBe("high");
    expect(out.get("k1")?.model).toBeTruthy(); // pickRiskModel chose a model
  });

  it("excludes errored/expired requests", async () => {
    const client = mockClient({
      statuses: ["ended"],
      results: [{ custom_id: "k1", result: { type: "errored" } }],
    });
    const out = await runRiskBatch(items, { client, pollMs: 1 });
    expect(out.has("k1")).toBe(false);
  });

  it("cancels and returns empty when the batch never ends within the budget", async () => {
    let cancelled = false;
    const client = mockClient({
      statuses: ["in_progress"], // never ends
      onCancel: () => { cancelled = true; },
    });
    const out = await runRiskBatch(items, { client, pollMs: 1, maxWaitMs: 5 });
    expect(out.size).toBe(0);
    expect(cancelled).toBe(true);
  });

  it("returns an empty map (no throw) for no items", async () => {
    const out = await runRiskBatch([], {});
    expect(out.size).toBe(0);
  });
});
