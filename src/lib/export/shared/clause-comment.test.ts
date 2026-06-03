import { describe, it, expect } from "vitest";
import type { LegalCitation } from "@/types/contract";
import {
  clauseHasComment,
  composeClauseComment,
  deriveClauseSummary,
  displayRuleIds,
  formatRuleIds,
  sanitizeForExport,
} from "./clause-comment";

const cite = (text: string, status: LegalCitation["status"]): LegalCitation => ({
  id: text,
  text,
  source: "Indian Contract Act",
  section: "73",
  status,
});

// Flatten a comment to plain text per paragraph for easy assertions.
function lines(input: Parameters<typeof composeClauseComment>[0]): string[] {
  return composeClauseComment(input).map((b) => b.map((r) => r.text).join(""));
}

describe("sanitizeForExport", () => {
  it("maps internal engine jargon to a neutral counsel-facing line", () => {
    expect(sanitizeForExport("Risk analyzer returned an unparseable response")).toMatch(
      /inconclusive/i,
    );
    expect(sanitizeForExport("The legal analysis model produced an invalid result")).toMatch(
      /inconclusive/i,
    );
    expect(sanitizeForExport("failed to parse the model output")).toMatch(/inconclusive/i);
  });

  it("passes through legitimate text and trims, returns '' for empty", () => {
    expect(sanitizeForExport("  Uncapped indemnity exposure.  ")).toBe(
      "Uncapped indemnity exposure.",
    );
    expect(sanitizeForExport(null)).toBe("");
    expect(sanitizeForExport("   ")).toBe("");
  });
});

describe("deriveClauseSummary", () => {
  it("returns honest market-standard copy for standard/low with no issue (no benchmark claim)", () => {
    const s = deriveClauseSummary("standard", null);
    expect(s).not.toMatch(/benchmark corpus/i);
    expect(s).toMatch(/market-standard drafting and our review playbook/i);
  });

  it("uses the (sanitized, cite-stripped) issue when present", () => {
    expect(deriveClauseSummary("high", "Uncapped liability [CITE:ica-73].")).toBe(
      "Uncapped liability.",
    );
    expect(deriveClauseSummary("high", "Risk analyzer returned an unparseable response")).toMatch(
      /inconclusive/i,
    );
  });

  it("has level-appropriate fallbacks for missing and risky clauses", () => {
    expect(deriveClauseSummary("missing", null)).toMatch(/not present/i);
    expect(deriveClauseSummary("high", null)).toMatch(/material risk/i);
  });
});

describe("rule id helpers", () => {
  it("displayRuleIds drops engine sentinels", () => {
    expect(displayRuleIds(["a.b", "LLM_PARSE_FAILED", "c.d"])).toEqual(["a.b", "c.d"]);
    expect(displayRuleIds(null)).toEqual([]);
  });

  it("formatRuleIds shows first 3 then a count", () => {
    expect(formatRuleIds(["a", "b"])).toBe("a, b");
    expect(formatRuleIds(["a", "b", "c", "d", "e"])).toBe("a, b, c +2 more");
  });
});

describe("composeClauseComment", () => {
  it("orders blocks: risk → deviation → summary → reasoning → citations", () => {
    const out = lines({
      riskLevel: "high",
      summary: "Uncapped indemnity.",
      reasoning: "Exposure is unbounded.",
      citations: [cite("ICA s.73", "verified")],
      ruleIds: ["liability.uncapped"],
    });
    expect(out[0]).toBe("High risk");
    expect(out[1]).toMatch(/Deviates from your playbook — flagged by liability\.uncapped/);
    expect(out[2]).toBe("Uncapped indemnity.");
    expect(out[3]).toMatch(/^Reasoning: Exposure is unbounded\./);
    expect(out[4]).toBe("Citations:");
    expect(out[5]).toBe("• ICA s.73 (verified)");
  });

  it("omits the deviation line for standard/low clauses even if rule ids exist", () => {
    const out = lines({
      riskLevel: "standard",
      summary: "Looks fine.",
      ruleIds: ["some.rule"],
    });
    expect(out.some((l) => /Deviates from your playbook/.test(l))).toBe(false);
  });

  it("renders honest citation statuses (partial / unverified)", () => {
    const out = lines({
      riskLevel: "medium",
      summary: "Check this.",
      citations: [cite("DPDP s.8", "partially_verified"), cite("X", "unverified")],
    });
    expect(out).toContain("• DPDP s.8 (partial)");
    expect(out).toContain("• X (unverified)");
  });

  it("clauseHasComment is false for a bare standard label with nothing else", () => {
    expect(
      clauseHasComment({ riskLevel: "standard", summary: "", reasoning: null, citations: [] }),
    ).toBe(false);
    expect(
      clauseHasComment({ riskLevel: "high", summary: "Risky.", reasoning: null, citations: [] }),
    ).toBe(true);
  });
});
