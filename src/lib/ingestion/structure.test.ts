import { describe, expect, it } from "vitest";
import { detectStructure } from "./structure";

function allClauseText(text: string): string {
  const doc = detectStructure(text);
  return doc.sections
    .flatMap((s) => s.clauses.map((c) => c.text))
    .join("\n");
}

describe("detectStructure", () => {
  it("recovers schedule content that appears AFTER the signature block", () => {
    // The signature block used to trigger a hard `break`, discarding every
    // schedule/annexure that followed — exactly where the most negotiated
    // commercial terms (pricing, SLAs) usually live.
    const text = [
      "1. SERVICES",
      "1.1 The Provider shall deliver the services described herein to the Customer in a professional manner.",
      "",
      "IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.",
      "",
      "For and on behalf of ACME Private Limited",
      "Name:",
      "Designation:",
      "Date:",
      "",
      "SCHEDULE A - PRICING",
      "A.1 The Customer shall pay the Provider the fees set out in this schedule within thirty days of each invoice.",
    ].join("\n");

    const combined = allClauseText(text);
    expect(combined).toMatch(/fees set out in this schedule/);
  });

  it("does not emit signature boilerplate (Name/Designation) as clauses", () => {
    const text = [
      "1. SERVICES",
      "1.1 The Provider shall deliver the services described herein to the Customer in a professional and workmanlike manner at all times.",
      "",
      "For and on behalf of ACME Private Limited",
      "Name:",
      "Designation:",
      "Date:",
    ].join("\n");

    const combined = allClauseText(text);
    expect(combined).not.toMatch(/Designation:/);
  });

  it("still segments a normal numbered contract body", () => {
    const text = [
      "1. DEFINITIONS",
      '1.1 "Confidential Information" means any non-public information disclosed by one party to the other under this Agreement.',
      "2. TERM",
      "2.1 This Agreement commences on the Effective Date and continues for an initial term of twenty-four months.",
    ].join("\n");

    const doc = detectStructure(text);
    const totalClauses = doc.sections.reduce((n, s) => n + s.clauses.length, 0);
    expect(totalClauses).toBeGreaterThanOrEqual(2);
    expect(allClauseText(text)).toMatch(/Confidential Information/);
  });
});
