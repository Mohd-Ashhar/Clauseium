import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  checkKanoon,
  isKanoonAvailable,
  _resetCacheForTests,
} from "./indian-kanoon";
import type { ExtractedCitation } from "./types";

const ORIG_TOKEN = process.env.INDIAN_KANOON_API_TOKEN;

beforeEach(() => {
  process.env.INDIAN_KANOON_API_TOKEN = "test-token";
  _resetCacheForTests();
});

afterEach(() => {
  if (ORIG_TOKEN === undefined) delete process.env.INDIAN_KANOON_API_TOKEN;
  else process.env.INDIAN_KANOON_API_TOKEN = ORIG_TOKEN;
});

function citation(overrides: Partial<ExtractedCitation> = {}): ExtractedCitation {
  return {
    id: "abc123",
    raw: "[CITE: Indian Contract Act | 73 | 1872]",
    caseOrStatute: "Indian Contract Act",
    sectionOrCitation: "73",
    year: 1872,
    formatValid: true,
    ...overrides,
  };
}

function makeFetch(json: unknown, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(json), { status }),
  ) as unknown as typeof fetch;
}

describe("checkKanoon", () => {
  it("isKanoonAvailable reflects env var", () => {
    expect(isKanoonAvailable()).toBe(true);
    delete process.env.INDIAN_KANOON_API_TOKEN;
    expect(isKanoonAvailable()).toBe(false);
  });

  it("returns unavailable when token missing", async () => {
    delete process.env.INDIAN_KANOON_API_TOKEN;
    const out = await checkKanoon(citation(), { fetchImpl: makeFetch({}) });
    expect(out.checked).toBe(false);
    expect(out.confirmed).toBe(false);
    expect(out.error).toBe("unavailable");
  });

  it("returns format invalid early", async () => {
    const fetchImpl = makeFetch({});
    const out = await checkKanoon(citation({ formatValid: false }), {
      fetchImpl,
    });
    expect(out.error).toBe("format invalid");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends Authorization: Token header", async () => {
    const fetchImpl = makeFetch({
      docs: [{ tid: 1745449, title: "Indian Contract Act Section 73" }],
    });
    await checkKanoon(citation(), { fetchImpl });
    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Token test-token",
    );
  });

  it("confirms when title fuzzy-matches above threshold", async () => {
    const fetchImpl = makeFetch({
      docs: [{ tid: 999, title: "Indian Contract Act Section 73" }],
    });
    const out = await checkKanoon(citation(), { fetchImpl });
    expect(out.confirmed).toBe(true);
    expect(out.url).toBe("https://indiankanoon.org/doc/999/");
  });

  it("does not confirm when no hits match", async () => {
    const fetchImpl = makeFetch({
      docs: [{ tid: 1, title: "Some Unrelated Statute" }],
    });
    const out = await checkKanoon(citation(), { fetchImpl });
    expect(out.confirmed).toBe(false);
    expect(out.error).toBeNull();
  });

  it("caches subsequent identical lookups", async () => {
    const fetchImpl = makeFetch({
      docs: [{ tid: 999, title: "Indian Contract Act Section 73" }],
    });
    const a = await checkKanoon(citation(), { fetchImpl });
    const b = await checkKanoon(citation(), { fetchImpl });
    expect(a.cacheHit).toBe(false);
    expect(b.cacheHit).toBe(true);
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("does not retry on 4xx", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("forbidden", { status: 403 }),
    ) as unknown as typeof fetch;
    const out = await checkKanoon(citation(), { fetchImpl });
    expect(out.confirmed).toBe(false);
    expect(out.error).toMatch(/403/);
    // p-retry's AbortError should prevent retries.
    expect(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(1);
  });
});
