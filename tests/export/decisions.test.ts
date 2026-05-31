import { describe, it, expect } from "vitest";
import {
  resolveExportText,
  resolveClauseDecision,
} from "@/lib/export/shared/decisions";
import type { ClauseAnalysis } from "@/types/contract";

const base = {
  riskLevel: "high" as const,
  originalText: "Original clause text.",
  suggestedRedline: "AI suggested wording.",
};

describe("resolveExportText", () => {
  it("accepted → replace with the AI suggestion (both modes)", () => {
    expect(resolveExportText(base, { state: "accepted", modifiedText: null }, "redlined")).toEqual({
      op: "replace",
      newText: "AI suggested wording.",
    });
    expect(resolveExportText(base, { state: "accepted", modifiedText: null }, "clean")).toEqual({
      op: "replace",
      newText: "AI suggested wording.",
    });
  });

  it("modified with edited text → replace with the reviewer's wording", () => {
    const r = resolveExportText(
      base,
      { state: "modified", modifiedText: "Reviewer wording." },
      "redlined",
    );
    expect(r).toEqual({ op: "replace", newText: "Reviewer wording." });
  });

  it("modified WITHOUT edited text → keep original, flagged", () => {
    const r = resolveExportText(base, { state: "modified", modifiedText: null }, "clean");
    expect(r.op).toBe("keep");
    expect(r.reason).toBe("modified-no-text");
  });

  it("rejected → keep original", () => {
    const r = resolveExportText(base, { state: "rejected", modifiedText: null }, "redlined");
    expect(r.op).toBe("keep");
    expect(r.reason).toBe("rejected");
  });

  it("pending → propose in redlined, keep in clean", () => {
    expect(resolveExportText(base, undefined, "redlined")).toEqual({
      op: "replace",
      newText: "AI suggested wording.",
    });
    expect(resolveExportText(base, undefined, "clean").op).toBe("keep");
  });

  it("no suggestion → keep original", () => {
    const r = resolveExportText(
      { ...base, suggestedRedline: null },
      { state: "accepted", modifiedText: null },
      "redlined",
    );
    expect(r.op).toBe("keep");
  });

  it("missing clause → insert (redlined always, clean only when accepted)", () => {
    const missing = { ...base, riskLevel: "missing" as const };
    expect(resolveExportText(missing, undefined, "redlined").op).toBe("insert");
    expect(resolveExportText(missing, { state: "accepted", modifiedText: null }, "clean").op).toBe("insert");
    expect(resolveExportText(missing, undefined, "clean").op).toBe("drop");
  });
});

describe("resolveClauseDecision adapter", () => {
  const clause: ClauseAnalysis = {
    id: "c1",
    clauseNumber: "1",
    category: "limitation_of_liability",
    title: "LoL",
    originalText: "Original.",
    riskLevel: "high",
    summary: "s",
    reasoning: "r",
    suggestedRedline: "AI text.",
    citations: [],
    confidence: 0.8,
    isFromPlaybook: false,
    marketPosition: "at",
  };

  it("modified+text in redlined → redline from original to edited text", () => {
    const d = resolveClauseDecision({ ...clause, modifiedText: "Edited." }, "modified", "redlined");
    expect(d).toEqual({ kind: "redline", from: "Original.", to: "Edited." });
  });

  it("modified+text in clean → manual-edit without needsWork", () => {
    const d = resolveClauseDecision({ ...clause, modifiedText: "Edited." }, "modified", "clean");
    expect(d).toEqual({ kind: "manual-edit", text: "Edited.", needsWork: false });
  });

  it("modified without text in clean → manual-edit needsWork", () => {
    const d = resolveClauseDecision(clause, "modified", "clean");
    expect(d).toEqual({ kind: "manual-edit", text: "Original.", needsWork: true });
  });

  it("rejected → original with note", () => {
    const d = resolveClauseDecision(clause, "rejected", "redlined");
    expect(d.kind).toBe("original");
  });
});
