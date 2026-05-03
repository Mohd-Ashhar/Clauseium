import { describe, it, expect } from "vitest";
import {
  uncappedLiability,
  capTooLow,
  noConsequentialExclusion,
  noCarveOuts,
} from "./limitation_of_liability";
import type { RuleCtx } from "../types";

function ctx(text: string): RuleCtx {
  return {
    clauseId: "x",
    clauseText: text,
    lower: text.toLowerCase(),
    category: "limitation_of_liability",
  };
}

describe("limitation_of_liability rules", () => {
  it("flags uncapped liability when no cap language present", () => {
    const found = uncappedLiability(
      ctx("The Service Provider shall be liable for all damages arising under this Agreement."),
    );
    expect(found).not.toBeNull();
    expect(found?.level).toBe("high");
    expect(found?.ruleId).toBe("lol.uncapped");
    expect(found?.explanation).toMatch(/\[CITE: Indian Contract Act 1872 \| s\.73 \| 1872\]/);
  });

  it("does not flag uncapped when an aggregate liability cap is present", () => {
    const found = uncappedLiability(
      ctx(
        "In no event shall the aggregate liability of either Party exceed the fees paid in the preceding twelve months.",
      ),
    );
    expect(found).toBeNull();
  });

  it("flags zero/nominal caps", () => {
    const found = capTooLow(
      ctx("The Service Provider's liability shall not exceed one rupee."),
    );
    expect(found?.ruleId).toBe("lol.cap_too_low");
    expect(found?.level).toBe("high");
  });

  it("flags missing consequential damages exclusion", () => {
    const found = noConsequentialExclusion(
      ctx("The Provider's aggregate liability shall not exceed fees paid in the prior 12 months."),
    );
    expect(found?.ruleId).toBe("lol.no_consequential_exclusion");
    expect(found?.level).toBe("medium");
  });

  it("does not flag consequential exclusion when present", () => {
    const found = noConsequentialExclusion(
      ctx(
        "Neither Party shall be liable for any consequential, indirect or punitive damages arising from this Agreement.",
      ),
    );
    expect(found).toBeNull();
  });

  it("flags missing carve-outs when a cap exists", () => {
    const found = noCarveOuts(
      ctx("In no event shall aggregate liability exceed fees paid in the preceding 12 months."),
    );
    expect(found?.ruleId).toBe("lol.no_carveouts");
  });

  it("does not flag carve-outs when fraud/gross negligence carve-out present", () => {
    const found = noCarveOuts(
      ctx(
        "In no event shall aggregate liability exceed fees paid; provided that the foregoing cap shall not apply to fraud or wilful misconduct.",
      ),
    );
    expect(found).toBeNull();
  });
});
