import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isBatchEnabled,
  readBatchMinClauses,
  runRiskBatch,
  type BatchItem,
} from "./batch";
import type { RiskBatchClient } from "./llm-analyzer";

const ENV_KEYS = ["RISK_USE_BATCH", "RISK_BATCH_DEFAULT", "RISK_BATCH_MIN_CLAUSES"];
const ORIG_ENV = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (ORIG_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIG_ENV[k] as string;
  }
});

describe("isBatchEnabled (default-on with override precedence)", () => {
  it("defaults ON when nothing is set", () => {
    delete process.env.RISK_USE_BATCH;
    delete process.env.RISK_BATCH_DEFAULT;
    expect(isBatchEnabled()).toBe(true);
  });
  it("explicit RISK_USE_BATCH=0 wins even when default on", () => {
    process.env.RISK_USE_BATCH = "0";
    delete process.env.RISK_BATCH_DEFAULT;
    expect(isBatchEnabled()).toBe(false);
  });
  it("explicit RISK_USE_BATCH=1 wins even when default off", () => {
    process.env.RISK_USE_BATCH = "1";
    process.env.RISK_BATCH_DEFAULT = "0";
    expect(isBatchEnabled()).toBe(true);
  });
  it("RISK_BATCH_DEFAULT=0 disables when no explicit override", () => {
    delete process.env.RISK_USE_BATCH;
    process.env.RISK_BATCH_DEFAULT = "0";
    expect(isBatchEnabled()).toBe(false);
  });
});

describe("readBatchMinClauses", () => {
  it("defaults to 12 and honours an override", () => {
    delete process.env.RISK_BATCH_MIN_CLAUSES;
    expect(readBatchMinClauses()).toBe(12);
    process.env.RISK_BATCH_MIN_CLAUSES = "0";
    expect(readBatchMinClauses()).toBe(0);
    process.env.RISK_BATCH_MIN_CLAUSES = "25";
    expect(readBatchMinClauses()).toBe(25);
  });
});

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
