import { describe, expect, it } from "vitest";
import { detectStructure, topLevelNumbers } from "./structure";

function allClauseText(text: string): string {
  const doc = detectStructure(text);
  return doc.sections
    .flatMap((s) => s.clauses.map((c) => c.text))
    .join("\n");
}

function topNums(text: string): number[] {
  return topLevelNumbers(detectStructure(text)).filter(
    (n): n is number => n !== null,
  );
}

function clauseStartingWith(text: string, prefix: string): string | undefined {
  return detectStructure(text)
    .sections.flatMap((s) => s.clauses)
    .find((c) => c.text.startsWith(prefix))?.text;
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

  it("folds a continuation fragment instead of splitting it as a new clause", () => {
    // "9 of this agreement…" begins mid-sentence (lowercase) — it is the tail of
    // the previous clause, not a clause 9.
    const text = [
      "1. SERVICES",
      "The provider shall deliver all services described in this agreement to the customer.",
      "2. PAYMENT",
      "All fees are payable within thirty days as further described in clause 9 below herein.",
      "9 of this agreement shall apply to any late payment and the interest payable thereon.",
      "3. TERM",
      "This agreement remains in force for an initial period of twenty four calendar months.",
    ].join("\n");
    const nums = topNums(text);
    expect(nums).toEqual([1, 2, 3]);
    expect(nums).not.toContain(9);
  });

  it("keeps numeric sub-items like '1)'/'2)' inside the parent clause (4(e)(1))", () => {
    const text = [
      "1. SCOPE",
      "This agreement establishes the framework for the provision of the services described.",
      "2. DEFINITIONS",
      "The capitalised terms used in this agreement have the meanings given to them herein.",
      "3. PURPOSE",
      "The purpose of this agreement is to set out the rights and obligations of the parties.",
      "4. OBLIGATIONS",
      "In terms of this agreement the service provider shall do the following matters listed:",
      "e) Withdraw or bar its employee from extending the services where the bank requires it.",
      "1) The quality of service rendered by the said employee was not at all satisfactory now.",
      "2) It is not in the interest of the bank that the said employee should continue here on.",
      "5. PAYMENT",
      "The customer shall pay every undisputed invoice within thirty days of its actual receipt.",
    ].join("\n");
    const nums = topNums(text);
    expect(nums).toEqual([1, 2, 3, 4, 5]);
    const clause4 = clauseStartingWith(text, "4.");
    expect(clause4).toMatch(/quality of service rendered/);
    expect(clause4).toMatch(/not in the interest of the bank/);
  });

  it("folds decimal, lettered and roman sub-clauses into their parent", () => {
    const text = [
      "1. PAYMENT TERMS",
      "1.1 The customer shall pay all undisputed invoices within thirty days of their receipt.",
      "1.2 Interest accrues on any overdue amount at the rate specified in the payment schedule.",
      "a) Payment shall be made by electronic transfer to the nominated bank account of seller.",
      "i) The remittance advice must accompany every payment that is made under this agreement.",
      "2. TERM",
      "This agreement continues for an initial term of twenty four months from the start date.",
    ].join("\n");
    const nums = topNums(text);
    expect(nums).toEqual([1, 2]);
    const clause1 = clauseStartingWith(text, "1.");
    expect(clause1).toMatch(/1\.1 The customer/);
    expect(clause1).toMatch(/1\.2 Interest/);
    expect(clause1).toMatch(/a\) Payment/);
    expect(clause1).toMatch(/i\) The remittance/);
  });

  it("does not treat an inline cross-reference as a new clause boundary", () => {
    const text = [
      "1. INDEMNITY",
      "The service provider shall indemnify the bank as further described in clause 9 herein.",
      "2. CONFIDENTIALITY",
      "Each party shall keep the other party's confidential information secret at all times.",
    ].join("\n");
    const nums = topNums(text);
    expect(nums).toEqual([1, 2]);
    expect(nums).not.toContain(9);
  });

  it("lets a schedule restart numbering (1,2 then 1,2)", () => {
    const text = [
      "1. SERVICES",
      "The provider delivers the services described in this agreement to the customer fully.",
      "2. TERM",
      "This agreement continues for twenty four months from the effective date stated herein.",
      "SCHEDULE 1",
      "1. PRICING",
      "The fees for the services are set out in the table below and exclude applicable taxes.",
      "2. SERVICE LEVELS",
      "The provider shall meet the service levels described in this schedule at all the times.",
    ].join("\n");
    expect(topNums(text)).toEqual([1, 2, 1, 2]);
  });

  it("handles an un-numbered document without crashing", () => {
    const text = [
      "This agreement is made between the parties for the provision of professional services.",
      "",
      "The provider shall perform the services with reasonable skill and care at all the times.",
      "",
      "Either party may terminate this agreement on thirty days written notice to the other one.",
    ].join("\n");
    const doc = detectStructure(text);
    const total = doc.sections.reduce((n, s) => n + s.clauses.length, 0);
    expect(total).toBeGreaterThanOrEqual(1);
    expect(allClauseText(text)).toMatch(/terminate this agreement/);
  });
});
