import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

// Capture inserts into the (mocked) service-role client.
const insertMock = vi.fn(async () => ({ error: null }));
const fromMock = vi.fn(() => ({ insert: insertMock }));
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

import { extractUsage, isCostLogEnabled, logLlmCall } from "./cost-log";

const ORIG = process.env.RISK_COST_LOG;

beforeEach(() => {
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  fromMock.mockClear();
});
afterEach(() => {
  if (ORIG === undefined) delete process.env.RISK_COST_LOG;
  else process.env.RISK_COST_LOG = ORIG;
});

describe("extractUsage", () => {
  it("maps Anthropic usage fields and tolerates missing ones", () => {
    expect(
      extractUsage({
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 20,
        cache_creation_input_tokens: 10,
      }),
    ).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 20,
      cacheCreationTokens: 10,
    });
    expect(extractUsage(undefined)).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    expect(extractUsage({ input_tokens: 7 }).inputTokens).toBe(7);
  });
});

describe("isCostLogEnabled", () => {
  it("is gated on RISK_COST_LOG=1", () => {
    process.env.RISK_COST_LOG = "1";
    expect(isCostLogEnabled()).toBe(true);
    process.env.RISK_COST_LOG = "0";
    expect(isCostLogEnabled()).toBe(false);
    delete process.env.RISK_COST_LOG;
    expect(isCostLogEnabled()).toBe(false);
  });
});

describe("logLlmCall", () => {
  it("does NOT insert when the flag is off", async () => {
    delete process.env.RISK_COST_LOG;
    await logLlmCall({ model: "claude-sonnet-4-6", method: "realtime" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a correctly-shaped row when the flag is on", async () => {
    process.env.RISK_COST_LOG = "1";
    await logLlmCall({
      contractId: "c1",
      model: "claude-opus-4-8",
      category: "indemnification",
      method: "cascade_escalate",
      usage: {
        inputTokens: 1200,
        outputTokens: 300,
        cacheReadTokens: 800,
        cacheCreationTokens: 0,
      },
    });
    expect(fromMock).toHaveBeenCalledWith("llm_call_log");
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith({
      contract_id: "c1",
      model: "claude-opus-4-8",
      category: "indemnification",
      method: "cascade_escalate",
      input_tokens: 1200,
      output_tokens: 300,
      cache_read_tokens: 800,
      cache_creation_tokens: 0,
      cache_hit: false,
      semdedup_collapsed: false,
    });
  });

  it("logs a cache hit with zero tokens", async () => {
    process.env.RISK_COST_LOG = "1";
    await logLlmCall({
      contractId: "c1",
      model: "(cache)",
      category: "termination",
      method: "cache_hit",
      cacheHit: true,
    });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: "cache_hit", cache_hit: true, input_tokens: 0 }),
    );
  });

  it("swallows a missing-table error (migration 0013 not applied) without throwing", async () => {
    process.env.RISK_COST_LOG = "1";
    insertMock.mockResolvedValueOnce({ error: { code: "42P01", message: "no table" } });
    await expect(
      logLlmCall({ model: "claude-sonnet-4-6", method: "realtime" }),
    ).resolves.toBeUndefined();
  });

  it("never throws even if the client blows up", async () => {
    process.env.RISK_COST_LOG = "1";
    insertMock.mockRejectedValueOnce(new Error("network down"));
    await expect(
      logLlmCall({ model: "claude-sonnet-4-6", method: "realtime" }),
    ).resolves.toBeUndefined();
  });
});
