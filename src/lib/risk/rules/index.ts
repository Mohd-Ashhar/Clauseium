import type { ClassificationLabel } from "@/lib/classification/categories";
import type { RuleFn } from "../types";

import { indemnificationRules } from "./indemnification";
import { limitationOfLiabilityRules } from "./limitation_of_liability";
import { terminationRules } from "./termination";
import { governingLawRules } from "./governing_law";
import { jurisdictionRules } from "./jurisdiction";
import { dataProtectionDpdpRules } from "./data_protection_dpdp";
import { paymentTermsRules } from "./payment_terms";
import { ipAssignmentRules } from "./ip_assignment";

export const RULE_REGISTRY: Record<ClassificationLabel, readonly RuleFn[]> = {
  indemnification: indemnificationRules,
  limitation_of_liability: limitationOfLiabilityRules,
  termination: terminationRules,
  governing_law: governingLawRules,
  jurisdiction: jurisdictionRules,
  data_protection_dpdp: dataProtectionDpdpRules,
  payment_terms: paymentTermsRules,
  ip_assignment: ipAssignmentRules,
  other: [],
};

export function rulesForCategory(category: ClassificationLabel): readonly RuleFn[] {
  return RULE_REGISTRY[category] ?? [];
}
