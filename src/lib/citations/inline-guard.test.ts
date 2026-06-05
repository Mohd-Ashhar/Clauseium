import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  scanInlineRefs,
  toCitationToken,
  neutralizeText,
  inlineGuardMode,
  inlineGuardEnabled,
} from "./inline-guard";

describe("scanInlineRefs", () => {
  it("detects an un-bracketed 'X Act, year' statutory reference", () => {
    const refs = scanInlineRefs("This clause violates the DPDP Act 2023 in spirit.");
    expect(refs).toHaveLength(1);
    expect(refs[0].kind).toBe("statute");
    expect(refs[0].name).toBe("DPDP Act");
    expect(refs[0].year).toBe(2023);
    expect(refs[0].surface).toContain("DPDP Act 2023");
  });

  it("detects 'Section N of the X Act, year'", () => {
    const refs = scanInlineRefs("damages under Section 73 of the Indian Contract Act, 1872 are recoverable.");
    expect(refs).toHaveLength(1);
    expect(refs[0].name).toBe("Indian Contract Act");
    expect(refs[0].section).toBe("73");
    expect(refs[0].year).toBe(1872);
  });

  it("does NOT detect a reference already inside a [CITE: …] token", () => {
    expect(scanInlineRefs("see [CITE: Indian Contract Act | 73 | 1872] here")).toHaveLength(0);
  });

  it("detects only the un-bracketed ref in mixed text", () => {
    const refs = scanInlineRefs(
      "under the DPDP Act 2023 and [CITE: Indian Contract Act | 73 | 1872]",
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].name).toBe("DPDP Act");
  });

  it("does not false-positive on prose without an Act+year", () => {
    expect(scanInlineRefs("the parties act in good faith on the 2023 roadmap")).toHaveLength(0);
    expect(scanInlineRefs("the agreement dated 2023")).toHaveLength(0);
  });

  it("de-dupes the section-form over the overlapping year-form", () => {
    const refs = scanInlineRefs("Section 8 of the Digital Personal Data Protection Act, 2023 applies.");
    expect(refs).toHaveLength(1);
    expect(refs[0].section).toBe("8");
  });
});

describe("toCitationToken", () => {
  it("builds a verifiable statute token with a section", () => {
    const [ref] = scanInlineRefs("Section 73 of the Indian Contract Act, 1872");
    const tok = toCitationToken(ref);
    expect(tok.caseOrStatute).toBe("Indian Contract Act");
    expect(tok.sectionOrCitation).toBe("73");
    expect(tok.year).toBe(1872);
    expect(tok.formatValid).toBe(true);
    expect(tok.id).toMatch(/^inline-/);
  });

  it("a name+year-only statute is still format-valid (act-level lookup)", () => {
    const [ref] = scanInlineRefs("the FEMA Act 1999");
    expect(toCitationToken(ref).formatValid).toBe(true);
  });
});

describe("neutralizeText", () => {
  it("replaces an unverified statute with neutral language", () => {
    const text = "This breaches the Foobar Act 1999 and is risky.";
    const [ref] = scanInlineRefs(text);
    const out = neutralizeText(text, new Set([ref.canonicalKey]));
    expect(out).toBe("This breaches applicable Indian law and is risky.");
  });

  it("leaves a VERIFIED statute untouched (key not in the unverified set)", () => {
    const text = "damages under the Indian Contract Act 1872 apply.";
    const out = neutralizeText(text, new Set(["statute|some other act|"]));
    expect(out).toBe(text);
  });

  it("is a no-op on empty input or empty set", () => {
    expect(neutralizeText("", new Set(["x"]))).toBe("");
    expect(neutralizeText("the DPDP Act 2023", new Set())).toBe("the DPDP Act 2023");
  });
});

describe("config", () => {
  it("defaults: enabled on, mode neutralize", () => {
    const e = process.env.INLINE_GUARD_ENABLED;
    const m = process.env.INLINE_GUARD_MODE;
    delete process.env.INLINE_GUARD_ENABLED;
    delete process.env.INLINE_GUARD_MODE;
    expect(inlineGuardEnabled()).toBe(true);
    expect(inlineGuardMode()).toBe("neutralize");
    process.env.INLINE_GUARD_MODE = "chip";
    expect(inlineGuardMode()).toBe("chip");
    process.env.INLINE_GUARD_ENABLED = "0";
    expect(inlineGuardEnabled()).toBe(false);
    if (e === undefined) delete process.env.INLINE_GUARD_ENABLED; else process.env.INLINE_GUARD_ENABLED = e;
    if (m === undefined) delete process.env.INLINE_GUARD_MODE; else process.env.INLINE_GUARD_MODE = m;
  });
});
