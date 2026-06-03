import { describe, expect, it } from "vitest";
import type { CitationStatus, LegalCitation, RiskLevel } from "@/types/contract";
import type { ClauseWorkspaceItem } from "./shared";
import {
  buildAuthorities,
  clauseAtOffset,
  nextHighRiskClause,
  sortAndFilterClauses,
  stripCiteTokens,
} from "./lib";

function cite(
  source: string,
  section: string,
  status: CitationStatus,
  extra: Partial<LegalCitation> = {},
): LegalCitation {
  return {
    id: `${source}-${section}`,
    text: `${source} ${section}`,
    source,
    section,
    status,
    ...extra,
  };
}

function clause(
  id: string,
  position: number,
  level: RiskLevel | null,
  citations: LegalCitation[] = [],
): ClauseWorkspaceItem {
  return {
    id,
    position,
    text: "clause text",
    sectionTitle: "Section",
    classification: null,
    risk: level
      ? {
          level,
          issue: null,
          explanation: null,
          suggestion: null,
          confidence: null,
          method: null,
          ruleIds: [],
        }
      : null,
    citations,
    trustScore: null,
    action: "pending",
    actionNote: null,
    actionModifiedText: null,
  };
}

describe("stripCiteTokens", () => {
  it("removes [CITE:…] tokens and tidies spacing", () => {
    expect(stripCiteTokens("Pay on time [CITE:ica-73] .")).toBe("Pay on time.");
    expect(stripCiteTokens(null)).toBe("");
    expect(stripCiteTokens("No tokens here.")).toBe("No tokens here.");
  });
});

describe("sortAndFilterClauses", () => {
  const clauses = [
    clause("a", 3, "low"),
    clause("b", 1, "high"),
    clause("c", 2, "medium"),
    clause("d", 4, "missing"),
  ];

  it("sorts by risk rank then position when filter=all", () => {
    const out = sortAndFilterClauses(clauses, "all").map((c) => c.id);
    // high(0) < missing(1) < medium(2) < low(3); ties broken by position
    expect(out).toEqual(["b", "d", "c", "a"]);
  });

  it("filters to a single risk level", () => {
    expect(sortAndFilterClauses(clauses, "high").map((c) => c.id)).toEqual(["b"]);
    expect(sortAndFilterClauses(clauses, "missing").map((c) => c.id)).toEqual(["d"]);
  });

  it("treats low + standard + no-risk as 'standard'", () => {
    const list = [clause("x", 1, "low"), clause("y", 2, "standard"), clause("z", 3, null)];
    expect(sortAndFilterClauses(list, "standard").map((c) => c.id)).toEqual(["x", "y", "z"]);
  });
});

describe("buildAuthorities", () => {
  it("dedupes by source+section and lists relying clauses", () => {
    const clauses = [
      clause("c1", 1, "high", [cite("Indian Contract Act", "73", "verified")]),
      clause("c2", 2, "medium", [cite("Indian Contract Act", "Section 73", "verified")]),
      clause("c3", 3, "low", [cite("DPDP Act", "8", "unverified")]),
    ];
    const auths = buildAuthorities(clauses);
    const ica = auths.find((a) => a.source === "Indian Contract Act");
    expect(ica?.relying.map((r) => r.position).sort()).toEqual([1, 2]);
    expect(ica?.label).toBe("Indian Contract Act § 73");
  });

  it("worst status wins across multiple uses", () => {
    const clauses = [
      clause("c1", 1, "high", [cite("DPDP Act", "8", "verified")]),
      clause("c2", 2, "high", [cite("DPDP Act", "8", "unverified")]),
    ];
    const [auth] = buildAuthorities(clauses);
    expect(auth.status).toBe("unverified");
  });

  it("sorts unverified authorities first", () => {
    const clauses = [
      clause("c1", 1, "high", [cite("A Act", "1", "verified")]),
      clause("c2", 2, "high", [cite("B Act", "2", "unverified")]),
    ];
    expect(buildAuthorities(clauses)[0].source).toBe("B Act");
  });
});

describe("keyboard navigation", () => {
  const list = [
    clause("a", 1, "low"),
    clause("b", 2, "high"),
    clause("c", 3, "medium"),
    clause("d", 4, "high"),
  ];

  it("clauseAtOffset moves and clamps", () => {
    expect(clauseAtOffset(list, "a", 1)).toBe("b");
    expect(clauseAtOffset(list, "a", -1)).toBe("a"); // clamped at start
    expect(clauseAtOffset(list, "d", 1)).toBe("d"); // clamped at end
    expect(clauseAtOffset(list, null, 1)).toBe("a"); // no active → first
    expect(clauseAtOffset([], "a", 1)).toBeNull();
  });

  it("nextHighRiskClause jumps among high-risk only", () => {
    expect(nextHighRiskClause(list, "a", true)).toBe("b");
    expect(nextHighRiskClause(list, "b", true)).toBe("d");
    expect(nextHighRiskClause(list, "d", true)).toBe("b"); // wraps
    expect(nextHighRiskClause(list, "d", false)).toBe("b");
    expect(nextHighRiskClause([clause("x", 1, "low")], "x", true)).toBeNull();
  });
});
