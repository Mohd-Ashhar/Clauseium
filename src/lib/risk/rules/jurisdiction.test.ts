import { describe, it, expect } from "vitest";
import {
  foreignForumNoArbitration,
  noJurisdictionAtAll,
  nonExclusiveJurisdiction,
  indianForumGood,
} from "./jurisdiction";
import type { RuleCtx } from "../types";

function ctx(text: string): RuleCtx {
  return {
    clauseId: "x",
    clauseText: text,
    lower: text.toLowerCase(),
    category: "jurisdiction",
  };
}

describe("jurisdiction rules", () => {
  it("flags exclusive foreign forum without arbitration", () => {
    const f = foreignForumNoArbitration(
      ctx("The courts of London shall have exclusive jurisdiction over any dispute under this Agreement."),
    );
    expect(f?.ruleId).toBe("juris.foreign_no_arbitration");
    expect(f?.level).toBe("high");
  });

  it("does not flag foreign forum if arbitration is the chosen mechanism", () => {
    const f = foreignForumNoArbitration(
      ctx("Any dispute shall be referred to arbitration seated in Singapore under the SIAC Rules."),
    );
    expect(f).toBeNull();
  });

  it("flags missing jurisdiction altogether", () => {
    const f = noJurisdictionAtAll(
      ctx("The Parties agree to perform their obligations in good faith."),
    );
    expect(f?.ruleId).toBe("juris.missing");
    expect(f?.level).toBe("missing");
  });

  it("flags non-exclusive jurisdiction", () => {
    const f = nonExclusiveJurisdiction(
      ctx("The courts at Mumbai shall have non-exclusive jurisdiction over any dispute."),
    );
    expect(f?.ruleId).toBe("juris.non_exclusive");
  });

  it("recognises Indian exclusive forum as low risk / standard", () => {
    const f = indianForumGood(
      ctx("The courts at Mumbai shall have exclusive jurisdiction over any dispute under this Agreement."),
    );
    expect(f?.ruleId).toBe("juris.indian_exclusive");
    expect(f?.level).toBe("low");
  });
});
