import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const embedQueryMock = vi.fn();
const searchCorpusMock = vi.fn();

vi.mock("@/lib/rag/embed", () => ({
  embedQuery: (...args: unknown[]) => embedQueryMock(...args),
  embedBatch: vi.fn(),
  EMBEDDING_DIMENSIONS: 1536,
}));

vi.mock("@/lib/rag/search", () => ({
  searchLegalCorpus: (...args: unknown[]) => searchCorpusMock(...args),
}));

import { verifyCitationsForClause } from "./pipeline";
import { _resetCacheForTests } from "./indian-kanoon";
import type { SupabaseClient } from "@supabase/supabase-js";

const ORIG_KANOON = process.env.INDIAN_KANOON_API_TOKEN;
const ORIG_OPENAI = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.INDIAN_KANOON_API_TOKEN = "test-token";
  process.env.OPENAI_API_KEY = "test-openai";
  embedQueryMock.mockReset();
  searchCorpusMock.mockReset();
  _resetCacheForTests();
});

afterEach(() => {
  if (ORIG_KANOON === undefined) delete process.env.INDIAN_KANOON_API_TOKEN;
  else process.env.INDIAN_KANOON_API_TOKEN = ORIG_KANOON;
  if (ORIG_OPENAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIG_OPENAI;
});

interface SupaQueryResult {
  data: unknown[];
  error: null;
}

function makeSupabase(
  legalDocs: Record<string, SupaQueryResult>,
  legalChunks: SupaQueryResult,
): SupabaseClient {
  const builder = (resultKey: string) => {
    const state: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        state[col] = val;
        return chain;
      },
      ilike: () => chain,
      limit: () => {
        const key = `${resultKey}:${state.source ?? ""}`;
        return Promise.resolve(legalDocs[key] ?? { data: [], error: null });
      },
    };
    return chain;
  };

  // Two distinct paths use legal_chunks:
  //   1. metadata lookup in local-check.ts (ilike + limit) — return empty so
  //      the test falls through to the legal_documents fixture below.
  //   2. embedding lookup for relevance scoring (eq + limit) — return the
  //      embedding fixture so cosine similarity can be computed.
  const makeChunksChain = () => {
    let usedIlike = false;
    const chain = {
      select: () => chain,
      eq: () => chain,
      ilike: () => {
        usedIlike = true;
        return chain;
      },
      limit: () =>
        Promise.resolve(usedIlike ? { data: [], error: null } : legalChunks),
    };
    return chain;
  };

  return {
    from: (table: string) => {
      if (table === "legal_documents") return builder("legal_documents");
      if (table === "legal_chunks") return makeChunksChain();
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

function makeFetch(json: unknown): typeof fetch {
  return vi.fn(
    async () => new Response(JSON.stringify(json), { status: 200 }),
  ) as unknown as typeof fetch;
}

const ICA_73_ROW = {
  id: "doc-ica-73",
  source: "statute",
  statute_name: "Indian Contract Act",
  section: "73",
  case_name: null,
  citation: null,
  url: "https://indiankanoon.org/doc/1745449/",
  year: 1872,
};

describe("verifyCitationsForClause", () => {
  it("returns trust=1 when no citations are present", async () => {
    const supabase = makeSupabase({}, { data: [], error: null });
    const out = await verifyCitationsForClause(
      {
        clauseId: "clause-1",
        clauseText: "any text",
        citationCarrier: "no citations here",
      },
      { supabase, fetchImpl: makeFetch({ docs: [] }) },
    );
    expect(out.citations).toHaveLength(0);
    expect(out.trustScore).toBe(1);
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it("drops unverified hallucinated citation, keeps verified one", async () => {
    const clauseEmbedding = new Array(1536).fill(0.1);
    const matchingChunkEmbedding = new Array(1536).fill(0.1);
    embedQueryMock.mockResolvedValueOnce(clauseEmbedding);

    const supabase = makeSupabase(
      {
        // Real ICA s.73 → exact match returns one row
        "legal_documents:statute": {
          data: [
            {
              id: "doc-ica-73",
              source: "statute",
              statute_name: "Indian Contract Act",
              section: "73",
              case_name: null,
              citation: null,
              url: "https://indiankanoon.org/doc/1745449/",
              year: 1872,
            },
          ],
          error: null,
        },
        // Hallucinated section: no match
        "legal_documents:case": { data: [], error: null },
      },
      { data: [{ embedding: matchingChunkEmbedding }], error: null },
    );

    // Hallucinated → searchLegalCorpus returns nothing relevant
    searchCorpusMock.mockResolvedValue([]);

    const fetchImpl = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("Section%20999") || u.includes("999")) {
        return new Response(
          JSON.stringify({ docs: [{ tid: 1, title: "unrelated" }] }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          docs: [{ tid: 1745449, title: "Indian Contract Act Section 73" }],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const carrier =
      "Per [CITE: Indian Contract Act | 73 | 1872] damages flow. Also see [CITE: Indian Contract Act | 999 | 1872].";

    const out = await verifyCitationsForClause(
      {
        clauseId: "clause-x",
        clauseText: "Compensation for breach of contract under Indian law.",
        citationCarrier: carrier,
      },
      { supabase, fetchImpl },
    );

    expect(out.results).toHaveLength(2);
    expect(out.citations.length).toBeGreaterThanOrEqual(1);
    expect(out.citations.length).toBeLessThanOrEqual(2);

    const verifiedIds = out.citations.map((c) => c.section);
    expect(verifiedIds).toContain("73");

    // Hallucinated section should be dropped
    if (out.citations.length === 1) {
      expect(verifiedIds).not.toContain("999");
    }

    expect(out.pipelineLog.evt).toBe("citation.pipeline");
    expect(out.pipelineLog.extracted).toBe(2);
    expect(out.trustScore).toBeLessThan(1);
    expect(out.trustScore).toBeGreaterThan(0);
  });

  // An exact curated-corpus match is our source of truth: it is "verified" even
  // when Indian Kanoon is unavailable. This is the P1-2 fix — previously this
  // exact ICA s.73 hit was wrongly downgraded to "partially_verified" because
  // "verified" required BOTH local AND Kanoon.
  it("verifies an exact corpus match even when Kanoon is unavailable", async () => {
    delete process.env.INDIAN_KANOON_API_TOKEN;
    const clauseEmbedding = new Array(1536).fill(0.1);
    const matchingChunkEmbedding = new Array(1536).fill(0.1);
    embedQueryMock.mockResolvedValueOnce(clauseEmbedding);

    const supabase = makeSupabase(
      { "legal_documents:statute": { data: [ICA_73_ROW], error: null } },
      { data: [{ embedding: matchingChunkEmbedding }], error: null },
    );

    const out = await verifyCitationsForClause(
      {
        clauseId: "clause-y",
        clauseText: "Compensation for breach of contract under Indian law.",
        citationCarrier: "[CITE: Indian Contract Act | 73 | 1872]",
      },
      { supabase, fetchImpl: makeFetch({ docs: [] }) },
    );

    expect(out.citations).toHaveLength(1);
    expect(out.citations[0].status).toBe("verified");
    expect(out.citations[0].warning).toBeUndefined();
  });

  it("verifies an exact corpus match even with neutral relevance (no chunk embedding)", async () => {
    delete process.env.INDIAN_KANOON_API_TOKEN;
    const clauseEmbedding = new Array(1536).fill(0.1);
    embedQueryMock.mockResolvedValueOnce(clauseEmbedding);

    // No chunk embedding → relevance falls back to neutral 0.5 (which is below
    // the old 0.55 cutoff). It must still verify on the exact corpus match.
    const supabase = makeSupabase(
      { "legal_documents:statute": { data: [ICA_73_ROW], error: null } },
      { data: [], error: null },
    );

    const out = await verifyCitationsForClause(
      {
        clauseId: "clause-z",
        clauseText: "Damages for breach.",
        citationCarrier: "[CITE: Indian Contract Act | 73 | 1872]",
      },
      { supabase, fetchImpl: makeFetch({ docs: [] }) },
    );

    expect(out.citations[0].status).toBe("verified");
  });

  it("demotes an exact match to partial when the clause is off-topic for it (P2-1)", async () => {
    delete process.env.INDIAN_KANOON_API_TOKEN;
    const clauseEmbedding = new Array(1536).fill(0.1);
    const oppositeChunkEmbedding = new Array(1536).fill(-0.1); // cosine → 0 relevance
    embedQueryMock.mockResolvedValueOnce(clauseEmbedding);

    const supabase = makeSupabase(
      { "legal_documents:statute": { data: [ICA_73_ROW], error: null } },
      { data: [{ embedding: oppositeChunkEmbedding }], error: null },
    );

    const out = await verifyCitationsForClause(
      {
        clauseId: "clause-mismatch",
        clauseText: "Each party shall keep the other's confidential information secret.",
        citationCarrier: "[CITE: Indian Contract Act | 73 | 1872]",
      },
      { supabase, fetchImpl: makeFetch({ docs: [] }) },
    );

    expect(out.citations[0].status).toBe("partially_verified");
    expect(out.citations[0].warning).toMatch(/relevance|partial/i);
  });
});
