import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ContractRecord } from "@/types/ingestion";

// Spies shared between the vi.mock factories (hoisted) and the assertions.
const h = vi.hoisted(() => ({
  parseDocx: vi.fn(),
  parsePdf: vi.fn(),
  persistContract: vi.fn(async () => {}),
  finalizeContractReady: vi.fn(async () => {}),
  classifyClauses: vi.fn(),
  persistClassifications: vi.fn(async () => {}),
  verifyAndPersistCitations: vi.fn(async () => {}),
  analyzeClauseRisks: vi.fn(async () => []),
  analyzeDocument: vi.fn(async () => ({})),
  persistRiskAnalyses: vi.fn(async () => {}),
  persistDocumentAnalysis: vi.fn(async () => true),
  clientRef: { current: null as unknown },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => h.clientRef.current,
}));
vi.mock("./parse-docx", () => ({ parseDocx: h.parseDocx }));
vi.mock("./parse-pdf", () => ({ parsePdf: h.parsePdf }));
vi.mock("./persist", () => ({
  persistContract: h.persistContract,
  finalizeContractReady: h.finalizeContractReady,
}));
vi.mock("@/lib/classification", () => ({
  classifyClauses: h.classifyClauses,
  persistClassifications: h.persistClassifications,
}));
vi.mock("@/lib/citations/persist", () => ({
  verifyAndPersistCitations: h.verifyAndPersistCitations,
}));
vi.mock("@/lib/risk", () => ({
  analyzeClauseRisks: h.analyzeClauseRisks,
  analyzeDocument: h.analyzeDocument,
  isRiskLlmAvailable: () => true,
  persistRiskAnalyses: h.persistRiskAnalyses,
  persistDocumentAnalysis: h.persistDocumentAnalysis,
  createRiskCache: () => ({ get: async () => new Map(), set: async () => {} }),
}));

import { processContract } from "./orchestrate";

interface FakeState {
  structuredJson: unknown; // non-null ⇒ "already parsed"
  documentAnalysis: unknown; // non-null ⇒ "doc analysis present"
  clauseRows: Array<{
    id: string;
    clause_text: string;
    section_title: string | null;
    position: number;
    risk_analyzed_at: string | null;
  }>;
}

// Minimal thenable Supabase builder: records table/op/cols and resolves canned
// rows from the test's FakeState.
function makeFakeClient(state: FakeState) {
  const make = (table: string) => {
    const b: Record<string, unknown> = {
      _table: table,
      _op: null as string | null,
      _cols: "",
      _count: false,
      select(cols: string, opts?: { count?: string }) {
        b._op = "select";
        b._cols = cols;
        b._count = Boolean(opts?.count);
        return b;
      },
      update() {
        b._op = "update";
        return b;
      },
      insert() {
        b._op = "insert";
        return b;
      },
      eq() {
        return b;
      },
      in() {
        return b;
      },
      order() {
        return b;
      },
      maybeSingle() {
        return b;
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(resolveResult(b, state)).then(resolve, reject);
      },
    };
    return b;
  };
  return {
    from: (table: string) => make(table),
    storage: {
      from: () => ({ download: async () => ({ data: null, error: null }) }),
    },
  };
}

function resolveResult(b: Record<string, unknown>, state: FakeState) {
  const cols = (b._cols as string) ?? "";
  if (b._op === "update") return { data: null, error: null };
  if (b._op === "select") {
    if (b._table === "contracts") {
      if (cols.includes("structured_json"))
        return { data: { structured_json: state.structuredJson }, error: null };
      if (cols.includes("document_analysis"))
        return { data: { document_analysis: state.documentAnalysis }, error: null };
      return { data: {}, error: null };
    }
    if (b._table === "clauses") {
      if (b._count)
        return { count: state.clauseRows.length, data: null, error: null };
      return { data: state.clauseRows, error: null };
    }
  }
  return { data: null, error: null };
}

const CONTRACT = {
  id: "K1",
  title: "Test MSA",
  mime_type: "application/pdf",
  storage_path: "user/k1.pdf",
  page_count: 9,
} as unknown as ContractRecord;

beforeEach(() => {
  for (const fn of [
    h.parseDocx,
    h.parsePdf,
    h.persistContract,
    h.finalizeContractReady,
    h.classifyClauses,
    h.persistClassifications,
    h.verifyAndPersistCitations,
    h.analyzeClauseRisks,
    h.analyzeDocument,
    h.persistRiskAnalyses,
    h.persistDocumentAnalysis,
  ]) {
    fn.mockClear();
  }
  // classifyClauses echoes a category per input id.
  h.classifyClauses.mockImplementation(async (inputs: Array<{ id: string }>) =>
    inputs.map((c) => ({
      clauseId: c.id,
      category: "other",
      confidence: 0.9,
      method: "rule",
      matchedRule: null,
      model: null,
      reasoning: null,
    })),
  );
  h.analyzeClauseRisks.mockResolvedValue([]);
  h.persistDocumentAnalysis.mockResolvedValue(true);
});

describe("processContract — resume is idempotent (no double-bill)", () => {
  it("a fully-analyzed contract re-runs WITHOUT re-parsing or paying for risk/document analysis", async () => {
    h.clientRef.current = makeFakeClient({
      structuredJson: { sections: [] }, // already parsed
      documentAnalysis: { summary: "done" }, // doc stage already done
      clauseRows: [
        { id: "c1", clause_text: "Clause one text.", section_title: "S", position: 0, risk_analyzed_at: "2026-06-01T00:00:00Z" },
        { id: "c2", clause_text: "Clause two text.", section_title: "S", position: 1, risk_analyzed_at: "2026-06-01T00:00:00Z" },
      ],
    });

    await processContract(CONTRACT);

    // Parse skipped (clauses already persisted) — no wipe, no re-parse.
    expect(h.parsePdf).not.toHaveBeenCalled();
    expect(h.parseDocx).not.toHaveBeenCalled();
    expect(h.persistContract).not.toHaveBeenCalled();
    // The EXPENSIVE stages are skipped: every clause already has risk, doc exists.
    expect(h.analyzeClauseRisks).not.toHaveBeenCalled();
    expect(h.analyzeDocument).not.toHaveBeenCalled();
    // Still finalizes 'ready'.
    expect(h.finalizeContractReady).toHaveBeenCalledTimes(1);
  });

  it("a partial resume re-analyzes ONLY the clauses that were never risked", async () => {
    h.clientRef.current = makeFakeClient({
      structuredJson: { sections: [] },
      documentAnalysis: { summary: "done" }, // doc already done → skipped
      clauseRows: [
        { id: "c1", clause_text: "Clause one text.", section_title: "S", position: 0, risk_analyzed_at: "2026-06-01T00:00:00Z" },
        { id: "c2", clause_text: "Clause two text.", section_title: "S", position: 1, risk_analyzed_at: null },
        { id: "c3", clause_text: "Clause three text.", section_title: "S", position: 2, risk_analyzed_at: null },
      ],
    });

    await processContract(CONTRACT);

    expect(h.analyzeClauseRisks).toHaveBeenCalledTimes(1);
    const inputs = (h.analyzeClauseRisks.mock.calls[0] as unknown[])[0] as Array<{
      clauseId: string;
    }>;
    expect(inputs.map((i) => i.clauseId).sort()).toEqual(["c2", "c3"]);
    // Doc analysis already present → still skipped.
    expect(h.analyzeDocument).not.toHaveBeenCalled();
  });
});
