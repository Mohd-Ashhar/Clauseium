import { describe, expect, it } from "vitest";
import { detectContractType } from "./detect";
import { checkPlaybook } from "./check";

describe("detectContractType", () => {
  it("detects NDA from the title with high confidence", () => {
    const d = detectContractType("Mutual Non-Disclosure Agreement", "");
    expect(d.type).toBe("nda");
    expect(d.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("detects MSA from the title", () => {
    const d = detectContractType("Master Services Agreement", "");
    expect(d.type).toBe("msa");
  });

  it("detects employment from the title", () => {
    const d = detectContractType("Employment Agreement", "");
    expect(d.type).toBe("employment");
  });

  it("falls back to body cues when the title is generic", () => {
    const d = detectContractType(
      "Agreement",
      "This statement of work sets out the deliverables and milestones for the project.",
    );
    expect(d.type).toBe("sow");
    expect(d.confidence).toBeLessThan(0.9);
  });

  it("defaults to generic when nothing matches", () => {
    const d = detectContractType("Untitled", "Some unrelated prose about nothing in particular.");
    expect(d.type).toBe("generic");
  });
});

describe("checkPlaybook", () => {
  it("flags missing liability cap and indemnity in a bare MSA", () => {
    const text =
      "The Service Provider shall provide the services. Payment shall be made within thirty days of invoice. This Agreement is governed by the laws of India.";
    const result = checkPlaybook("msa", text);
    const missingKeys = result.missing.map((m) => m.key);
    expect(missingKeys).toContain("limitation_of_liability");
    expect(missingKeys).toContain("indemnification");
    expect(missingKeys).toContain("confidentiality");
    // Payment + governing law ARE present, so must NOT be flagged.
    expect(missingKeys).not.toContain("payment_terms");
    expect(missingKeys).not.toContain("governing_law");
  });

  it("recognises present protections (no false missing) in a fuller contract", () => {
    const text = `
      Limitation of liability: in no event shall either party be liable for indirect damages, and aggregate liability shall not exceed the fees paid.
      Indemnification: each party shall indemnify and hold harmless the other against third party claims.
      Confidentiality: the receiving party shall keep confidential information secret.
      Termination: either party may terminate for cause on thirty days notice.
      Governing law: this agreement is governed by the laws of India.
      Dispute resolution: disputes shall be referred to arbitration under the Arbitration and Conciliation Act 1996.
      Intellectual property: all deliverables and work product ownership vests in the customer; the supplier assigns all rights.
      Payment terms: the customer shall pay within forty five days.
      Personal data shall be processed in line with the data protection obligations of a data fiduciary.
    `;
    const result = checkPlaybook("msa", text);
    const missingRequired = result.missing.filter((m) => m.importance === "required");
    expect(missingRequired).toHaveLength(0);
  });

  it("uses the generic playbook for an unknown type", () => {
    const result = checkPlaybook("generic", "An agreement with no real protections.");
    expect(result.typeLabel).toMatch(/commercial/i);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
