import { describe, expect, it } from "vitest";
import { classifySubstance, isSubstantiveClause } from "./substantive-check";

describe("substantive-check", () => {
  it("flags template comments starting with **", () => {
    const text =
      "** This is only Mercy Corps' standard template for master service agreement contract. Some terms might be added or removed.";
    expect(isSubstantiveClause(text)).toBe(false);
    expect(classifySubstance(text)?.code).toBe("template_comment");
  });

  it("flags page markers", () => {
    expect(isSubstantiveClause("PAGE 1 of 11")).toBe(false);
    expect(classifySubstance("PAGE 1 of 11")?.code).toBe("page_marker");
  });

  it("flags attachment / exhibit markers", () => {
    expect(isSubstantiveClause("[Attachment - Sample MSA]")).toBe(false);
    expect(classifySubstance("[Attachment - Sample MSA]")?.code).toBe(
      "attachment_marker",
    );
  });

  it("flags bare title strings", () => {
    expect(isSubstantiveClause("MASTER SERVICE AGREEMENT")).toBe(false);
    expect(isSubstantiveClause("Statement of Work")).toBe(false);
    expect(classifySubstance("MASTER SERVICE AGREEMENT")?.code).toBe("bare_title");
  });

  it("flags table of contents markers", () => {
    expect(isSubstantiveClause("Table of Contents")).toBe(false);
    expect(classifySubstance("TABLE OF CONTENTS")?.code).toBe("table_of_contents");
  });

  it("flags signature block intros", () => {
    expect(
      isSubstantiveClause(
        "IN WITNESS WHEREOF, the parties have executed this Agreement.",
      ),
    ).toBe(false);
  });

  it("flags clauses shorter than 80 chars", () => {
    expect(isSubstantiveClause("This is short.")).toBe(false);
    expect(classifySubstance("This is short.")?.code).toBe("too_short");
  });

  it("flags clauses with fewer than 8 words even if long", () => {
    // 7 short words plus padding to clear the 80-char floor.
    const text =
      "Confidentiality_obligations_continue_indefinitely_through_termination_post_completion";
    expect(isSubstantiveClause(text)).toBe(false);
    expect(classifySubstance(text)?.code).toBe("too_few_words");
  });

  it("flags clauses that are mostly uppercase (likely headings)", () => {
    // ≥ 80 chars and ≥ 8 words so the cheaper checks don't fire first.
    const text =
      "INDEMNIFICATION AND LIMITATION OF LIABILITY UNDER THIS AGREEMENT AND ITS EXHIBITS";
    expect(isSubstantiveClause(text)).toBe(false);
    expect(classifySubstance(text)?.code).toBe("mostly_uppercase");
  });

  it("accepts a real substantive clause", () => {
    const text =
      "The Supplier shall indemnify and hold harmless the Customer from and against any and all claims, losses, damages, and liabilities of any nature arising from the Supplier's performance of this Agreement.";
    expect(isSubstantiveClause(text)).toBe(true);
    expect(classifySubstance(text)).toBeNull();
  });

  it("accepts a real DPDP clause", () => {
    const text =
      "Each party will process personal data in accordance with the Digital Personal Data Protection Act, 2023, including but not limited to obligations as a Data Fiduciary under § 8 and § 11.";
    expect(isSubstantiveClause(text)).toBe(true);
  });
});
