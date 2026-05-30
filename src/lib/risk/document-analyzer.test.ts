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
