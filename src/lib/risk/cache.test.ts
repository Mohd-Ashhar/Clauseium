import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createRiskCache,
  isCacheable,
  riskCacheKey,
  RISK_ANALYZER_VERSION,
} from "./cache";
import type { RiskAnalysisResult } from "./types";

const result = (over: Partial<RiskAnalysisResult> = {}): RiskAnalysisResult => ({
  clauseId: "c1",
  riskLevel: "high",
  issue: "Uncapped liability",
  explanation: "No cap.",
  suggestion: "Add a cap.",
  confidence: 0.7,
  method: "llm",
  ruleIds: ["lol.uncapped"],
  ...over,
});

describe("riskCacheKey", () => {
  it("is deterministic and ignores whitespace/case", () => {
    expect(riskCacheKey("Pay on TIME.", "payment_terms")).toBe(
      riskCacheKey("  pay on   time.  ", "payment_terms"),
    );
  });
  it("differs by category and by analyzer version basis", () => {
    expect(riskCacheKey("same text", "termination")).not.toBe(
      riskCacheKey("same text", "indemnification"),
    );
    expect(typeof RISK_ANALYZER_VERSION).toBe("number");
  });
});

describe("isCacheable", () => {
  it("rejects soft-fallback (LLM_PARSE_FAILED) results", () => {
    expect(isCacheable(result())).toBe(true);
    expect(isCacheable(result({ ruleIds: ["lol.uncapped", "LLM_PARSE_FAILED"] }))).toBe(false);
  });
});

// Minimal thenable Supabase fake for the cache's two queries.
function fakeClient(state: {
  getData?: Array<{ cache_key: string; result: unknown }>;
  getError?: { code: string; message: string } | null;
  setError?: { code: string; message: string } | null;
  captured?: { rows?: unknown };
}) {
  const make = () => {
    let op: "get" | "set" | null = null;
    const b: Record<string, unknown> = {
      select() { op = "get"; return b; },
      in() { return b; },
      eq() { return b; },
      gte() { return b; },
      upsert(rows: unknown) { op = "set"; if (state.captured) state.captured.rows = rows; return b; },
      then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
        const out =
          op === "set"
            ? { error: state.setError ?? null }
            : { data: state.getData ?? [], error: state.getError ?? null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return b;
  };
  return { from: () => make() } as never;
}

describe("createRiskCache", () => {
  it("get returns a map of cached results", async () => {
    const k = riskCacheKey("clause", "termination");
    const cache = createRiskCache(
      fakeClient({ getData: [{ cache_key: k, result: { riskLevel: "high" } }] }),
    );
    const map = await cache.get([k]);
    expect(map.get(k)).toEqual({ riskLevel: "high" });
  });

  it("get degrades to an empty map when the table is missing (migration not applied)", async () => {
    const cache = createRiskCache(
      fakeClient({ getError: { code: "42P01", message: "relation does not exist" } }),
    );
    const map = await cache.get(["k1", "k2"]);
    expect(map.size).toBe(0);
  });

  it("set strips clauseId and upserts the derived result", async () => {
    const captured: { rows?: unknown } = {};
    const cache = createRiskCache(fakeClient({ captured }));
    await cache.set([{ key: "abc", result: result() }]);
    const rows = captured.rows as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].cache_key).toBe("abc");
    expect(rows[0].analyzer_version).toBe(RISK_ANALYZER_VERSION);
    expect((rows[0].result as Record<string, unknown>).clauseId).toBeUndefined();
    expect((rows[0].result as Record<string, unknown>).riskLevel).toBe("high");
  });

  it("set is a no-op-safe when the table is missing", async () => {
    const cache = createRiskCache(
      fakeClient({ setError: { code: "42P01", message: "relation does not exist" } }),
    );
    await expect(cache.set([{ key: "abc", result: result() }])).resolves.toBeUndefined();
  });
});
