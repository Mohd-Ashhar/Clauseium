import { describe, expect, it, vi } from "vitest";

// Stub `server-only` so the search module can load in node test env.
vi.mock("server-only", () => ({}));

const liveEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  Boolean(process.env.OPENAI_API_KEY) &&
  process.env.RAG_LIVE_TESTS === "1";

const describeLive = liveEnv ? describe : describe.skip;

describeLive("searchLegalCorpus (live integration)", () => {
  it(
    "returns ICA §74 in top results for liquidated damages query",
    async () => {
      const { searchLegalCorpus } = await import("@/lib/rag/search");
      const hits = await searchLegalCorpus(
        "liquidated damages under Indian Contract Act",
        { topK: 5, logQuery: false },
      );
      expect(hits.length).toBeGreaterThan(0);
      const top3 = hits.slice(0, 3);
      const found = top3.some(
        (h) =>
          h.metadata.statute_name === "Indian Contract Act, 1872" &&
          h.metadata.section === "74",
      );
      expect(found).toBe(true);
      for (const h of hits) {
        expect(h.citation_verified).toBe(true);
        expect(h.metadata.jurisdiction).toBe("India");
      }
    },
    60_000,
  );

  it(
    "returns DPDP §8 in top results for data fiduciary query",
    async () => {
      const { searchLegalCorpus } = await import("@/lib/rag/search");
      const hits = await searchLegalCorpus(
        "DPDP data fiduciary obligations",
        { topK: 5, logQuery: false },
      );
      const top3 = hits.slice(0, 3);
      const found = top3.some(
        (h) =>
          h.metadata.statute_name?.includes("Digital Personal Data Protection") &&
          h.metadata.section === "8",
      );
      expect(found).toBe(true);
    },
    60_000,
  );

  it(
    "returns ICA §56 or Energy Watchdog for force majeure query",
    async () => {
      const { searchLegalCorpus } = await import("@/lib/rag/search");
      const hits = await searchLegalCorpus(
        "force majeure in commercial contracts",
        { topK: 5, logQuery: false },
      );
      const top3 = hits.slice(0, 3);
      const found = top3.some(
        (h) =>
          (h.metadata.statute_name === "Indian Contract Act, 1872" &&
            h.metadata.section === "56") ||
          h.metadata.case_name?.startsWith("Energy Watchdog"),
      );
      expect(found).toBe(true);
    },
    60_000,
  );
});

if (!liveEnv) {
  describe("searchLegalCorpus (live integration)", () => {
    it.skip(
      "skipped: set RAG_LIVE_TESTS=1 plus OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY to run",
      () => {
        // intentionally empty
      },
    );
  });
}
