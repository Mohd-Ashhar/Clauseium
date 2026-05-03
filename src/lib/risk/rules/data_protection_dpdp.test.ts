import { describe, it, expect } from "vitest";
import {
  dpdpNoBreachNotice,
  dpdpNoDataPrincipalRights,
  dpdpNoPurposeLimitation,
  dpdpNoFiduciaryRole,
  dpdpCrossBorderNoSafeguard,
  dpdpConsentBundling,
} from "./data_protection_dpdp";
import type { RuleCtx } from "../types";

function ctx(text: string): RuleCtx {
  return {
    clauseId: "x",
    clauseText: text,
    lower: text.toLowerCase(),
    category: "data_protection_dpdp",
  };
}

describe("data_protection_dpdp rules", () => {
  it("flags missing breach notification timeline", () => {
    const f = dpdpNoBreachNotice(
      ctx("The Vendor shall implement appropriate security measures to protect personal data."),
    );
    expect(f?.ruleId).toBe("dpdp.no_breach_notice");
    expect(f?.level).toBe("high");
    expect(f?.explanation).toContain("Digital Personal Data Protection Act 2023");
  });

  it("does not flag breach notice when 72-hour timeline is present", () => {
    const f = dpdpNoBreachNotice(
      ctx("The Data Fiduciary shall notify any personal data breach within 72 hours of becoming aware."),
    );
    expect(f).toBeNull();
  });

  it("flags missing data-principal rights", () => {
    const f = dpdpNoDataPrincipalRights(
      ctx("Vendor shall process personal data in accordance with applicable law."),
    );
    expect(f?.ruleId).toBe("dpdp.no_data_principal_rights");
  });

  it("flags missing purpose limitation", () => {
    const f = dpdpNoPurposeLimitation(
      ctx("Vendor may process personal data as required to provide services."),
    );
    expect(f?.ruleId).toBe("dpdp.no_purpose_limitation");
  });

  it("flags missing fiduciary/processor roles", () => {
    const f = dpdpNoFiduciaryRole(
      ctx("Each Party shall comply with all applicable data protection laws."),
    );
    expect(f?.ruleId).toBe("dpdp.no_fiduciary_role");
  });

  it("flags cross-border transfer without safeguard", () => {
    const f = dpdpCrossBorderNoSafeguard(
      ctx("Vendor may host personal data on servers located outside India for performance reasons."),
    );
    expect(f?.ruleId).toBe("dpdp.cross_border_no_safeguard");
    expect(f?.level).toBe("high");
  });

  it("does not flag cross-border when SCCs / notified-country mentioned", () => {
    const f = dpdpCrossBorderNoSafeguard(
      ctx(
        "Vendor may transfer personal data outside India only to a notified country or under standard contractual clauses.",
      ),
    );
    expect(f).toBeNull();
  });

  it("flags bundled consent", () => {
    const f = dpdpConsentBundling(
      ctx("By accepting this Agreement, the Customer also provides bundled consent to the processing of personal data."),
    );
    expect(f?.ruleId).toBe("dpdp.consent_bundling");
    expect(f?.level).toBe("high");
  });
});
