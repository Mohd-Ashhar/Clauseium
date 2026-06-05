import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: createMock };
    constructor(_cfg: { apiKey: string }) {}
  },
}));

vi.mock("server-only", () => ({}));

import { analyzeDocument, _resetDocAnalyzerForTests } from "./document-analyzer";

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  _resetDocAnalyzerForTests();
  createMock.mockReset();
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
});

function docTool(input: object) {
  return {
    content: [{ type: "tool_use", name: "submit_document_analysis", input }],
  };
}

const SAMPLE = {
  contractTitle: "Master Services Agreement",
  clauses: [
    {
      id: "c1",
      position: 0,
      sectionTitle: "Services",
      text: "The Service Provider shall provide the services described in each Statement of Work.",
    },
    {
      id: "c2",
      position: 1,
      sectionTitle: "Indemnity",
      text: "The Customer shall indemnify the Service Provider against all claims without limitation.",
    },
  ],
};

describe("analyzeDocument", () => {
  it("returns the parsed LLM whole-document analysis", async () => {
    createMock.mockResolvedValueOnce(
      docTool({
        executive_summary: "A vendor-favourable MSA with an uncapped customer indemnity.",
        overall_posture: "unfavourable",
        missing_protections: [
          {
            key: "limitation_of_liability",
            label: "Limitation of liability",
            risk_level: "high",
            rationale: "No cap on liability; exposure is unlimited under s.73 Contract Act.",
            suggested_clause: "Aggregate liability shall not exceed fees paid in the preceding 12 months.",
          },
        ],
        cross_clause_issues: [
          {
            title: "Uncapped indemnity defeats any liability position",
            risk_level: "high",
            clause_positions: [1],
            explanation: "The indemnity is unlimited and one-directional.",
            recommendation: "Make the indemnity mutual and subject to the liability cap.",
          },
        ],
        one_sided_terms: [],
      }),
    );

    const out = await analyzeDocument(SAMPLE);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(out.degraded).toBe(false);
    expect(out.contractType).toBe("msa");
    expect(out.overallPosture).toBe("unfavourable");
    expect(out.missingProtections).toHaveLength(1);
    expect(out.missingProtections[0].riskLevel).toBe("high");
    expect(out.crossClauseIssues[0].clausePositions).toEqual([1]);
  });

  it("falls back to the deterministic playbook when the LLM is unavailable", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    _resetDocAnalyzerForTests();

    const out = await analyzeDocument(SAMPLE);

    expect(createMock).not.toHaveBeenCalled();
    expect(out.degraded).toBe(true);
    expect(out.model).toBe("playbook-only");
    // The bare sample is missing a liability cap → playbook should surface it.
    const keys = out.missingProtections.map((m) => m.key);
    expect(keys).toContain("limitation_of_liability");
  });

  it("falls back to the playbook when the model returns no tool call", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "I need more context." }],
    });

    const out = await analyzeDocument(SAMPLE);

    expect(out.degraded).toBe(true);
    expect(out.model).toBe("playbook-only");
  });
});

// These reproduce the exact shapes that USED to discard a paid Opus response
// (hyphenated posture; clause_positions as a string; a findings array sent as a
// string) and assert we now coerce/salvage rather than throw → fallback.
describe("analyzeDocument — tolerant parsing (no wasted spend)", () => {
  it("coerces a hyphenated posture, a risk synonym, and a string clause_positions", async () => {
    createMock.mockResolvedValueOnce(
      docTool({
        executive_summary: "Risky MSA.",
        overall_posture: "high-risk", // hyphen — not in the strict enum
        missing_protections: [],
        cross_clause_issues: [
          {
            title: "Cap defeated by indemnity",
            risk_level: "critical", // synonym → high
            clause_positions: "3, 5", // string — not an array
            explanation: "Indemnity is uncapped.",
            recommendation: "Cap it.",
          },
        ],
        one_sided_terms: [],
      }),
    );

    const out = await analyzeDocument(SAMPLE);

    expect(out.degraded).toBe(false); // NOT discarded
    expect(out.overallPosture).toBe("high_risk");
    expect(out.crossClauseIssues).toHaveLength(1);
    expect(out.crossClauseIssues[0].riskLevel).toBe("high");
    expect(out.crossClauseIssues[0].clausePositions).toEqual([3, 5]);
  });

  it("salvages other fields when a findings array arrives as a string", async () => {
    createMock.mockResolvedValueOnce(
      docTool({
        executive_summary: "Some summary.",
        overall_posture: "unfavourable",
        missing_protections: "none found", // string instead of array
        cross_clause_issues: [],
        one_sided_terms: [
          {
            title: "One-sided termination",
            risk_level: "medium",
            clause_position: "clause 9", // string carrying a number
            explanation: "Only one party may terminate.",
            recommendation: "Make mutual.",
          },
        ],
      }),
    );

    const out = await analyzeDocument(SAMPLE);

    expect(out.degraded).toBe(false);
    expect(out.missingProtections).toEqual([]); // unsalvageable string → dropped
    expect(out.executiveSummary).toBe("Some summary.");
    expect(out.oneSidedTerms[0].clausePosition).toBe(9);
  });

  it("backfills an empty executive summary instead of showing a blank", async () => {
    createMock.mockResolvedValueOnce(
      docTool({
        executive_summary: "",
        overall_posture: "balanced",
        missing_protections: [
          { key: "k", label: "Liability cap", risk_level: "high", rationale: "No cap.", suggested_clause: "" },
        ],
        cross_clause_issues: [],
        one_sided_terms: [],
      }),
    );

    const out = await analyzeDocument(SAMPLE);

    expect(out.degraded).toBe(false);
    expect(out.executiveSummary.length).toBeGreaterThan(0);
    expect(out.missingProtections).toHaveLength(1);
  });
});

describe("analyzeDocument — cost gate (short + clean)", () => {
  // A short, playbook-complete contract: liability cap with carve-outs, mutual
  // indemnity, confidentiality, termination, governing law + arbitration, and
  // DPDP — so checkPlaybook finds no high-importance gap.
  const SHORT_CLEAN = {
    contractTitle: "Services Agreement",
    clauses: [
      { id: "c1", position: 0, sectionTitle: "Liability", text: "Notwithstanding the foregoing, the cap shall not apply to fraud, gross negligence or wilful misconduct. Each party's aggregate liability shall not exceed the fees paid in the preceding twelve months, and neither party shall be liable for indirect or consequential damages." },
      { id: "c2", position: 1, sectionTitle: "Indemnity", text: "Each party shall indemnify the other against third-party claims, including intellectual property infringement, subject to the limitation of liability." },
      { id: "c3", position: 2, sectionTitle: "Confidentiality", text: "Each party shall keep confidential all confidential information of the other party and shall not disclose it to any third party." },
      { id: "c4", position: 3, sectionTitle: "Term", text: "Either party may terminate on sixty days' written notice if the other commits a material breach not cured within thirty days; the confidentiality provisions survive termination." },
      { id: "c5", position: 4, sectionTitle: "Law", text: "This Agreement shall be governed by the laws of India and disputes shall be referred to arbitration seated in Mumbai under the Arbitration and Conciliation Act 1996." },
      { id: "c6", position: 5, sectionTitle: "Data", text: "As Data Processor for the specified purpose, the Processor shall notify the Data Fiduciary of any personal data breach within 72 hours, honour data principal rights of access and correction, and not transfer personal data outside India except to a notified country." },
    ],
  };

  const enabledGate = (over: Partial<{ clauseCount: number; anyHighOrMissing: boolean }> = {}) => ({
    skipIfSimple: true,
    minClauses: 8,
    clauseCount: 6,
    anyHighOrMissing: false,
    ...over,
  });

  it("SKIPS the LLM pass for a short, clean contract (deterministic playbook result)", async () => {
    const out = await analyzeDocument(SHORT_CLEAN, { gate: enabledGate() });
    expect(createMock).not.toHaveBeenCalled();
    expect(out.model).toBe("playbook-gated");
    expect(out.degraded).toBe(false);
  });

  it("RUNS the LLM pass when the contract is long (>= minClauses)", async () => {
    createMock.mockResolvedValueOnce(
      docTool({ executive_summary: "x", overall_posture: "balanced", missing_protections: [], cross_clause_issues: [], one_sided_terms: [] }),
    );
    await analyzeDocument(SHORT_CLEAN, { gate: enabledGate({ clauseCount: 20 }) });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("RUNS the LLM pass when any clause is high/missing", async () => {
    createMock.mockResolvedValueOnce(
      docTool({ executive_summary: "x", overall_posture: "balanced", missing_protections: [], cross_clause_issues: [], one_sided_terms: [] }),
    );
    await analyzeDocument(SHORT_CLEAN, { gate: enabledGate({ anyHighOrMissing: true }) });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("RUNS the LLM pass when the gate is disabled", async () => {
    createMock.mockResolvedValueOnce(
      docTool({ executive_summary: "x", overall_posture: "balanced", missing_protections: [], cross_clause_issues: [], one_sided_terms: [] }),
    );
    await analyzeDocument(SHORT_CLEAN, { gate: { ...enabledGate(), skipIfSimple: false } });
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
