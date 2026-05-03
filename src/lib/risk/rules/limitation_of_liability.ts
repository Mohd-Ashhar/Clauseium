import type { RuleFn } from "../types";

const HAS_CAP = /\b(?:aggregate\s+liability|total\s+liability|in\s+no\s+event)\b[\s\S]{0,120}\b(?:exceed|cap|limited\s+to|shall\s+not\s+exceed|capped\s+at)\b/i;
const ZERO_CAP = /\b(?:liability|damages)\b[\s\S]{0,80}\b(?:shall\s+(?:not\s+)?exceed|limited\s+to|capped\s+at)\s+(?:zero|nil|inr\s*0|rs\.?\s*0|0\s*\(zero\)|us?\s*\$\s*0|\$\s*0|one\s+rupee|rs\.?\s*1\b)/i;
const EXCLUDES_CONSEQUENTIAL = /\b(?:no\s+(?:party|liability)\s+for|exclud(?:e|ing|es|ed)|disclaim(?:s|ed)?|(?:neither|either)\s+party\s+shall\s+(?:not\s+)?be\s+liable\s+for|in\s+no\s+event\s+(?:shall|will)\s+(?:any|either|the)\s+party\s+be\s+liable)\b[\s\S]{0,80}\b(?:consequential|indirect|incidental|special|punitive|exemplary)\b/i;
const HAS_CARVE_OUT = /\b(?:notwithstanding|except\s+for|other\s+than|provided\s+that)[\s\S]{0,160}\b(?:fraud|gross\s+negligence|wilful\s+misconduct|willful\s+misconduct|indemnif|confidentiality|breach\s+of\s+(?:law|dpdp|data\s+protection))/i;

export const uncappedLiability: RuleFn = ({ lower }) => {
  if (HAS_CAP.test(lower)) return null;
  return {
    ruleId: "lol.uncapped",
    level: "high",
    issue: "No cap on aggregate liability.",
    explanation:
      "This clause does not cap aggregate liability, leaving exposure unlimited. Under Indian Contract Act §73, damages flowing naturally from breach can be substantial absent a contractual cap [CITE: Indian Contract Act 1872 | s.73 | 1872].",
    suggestion:
      "Add: 'Notwithstanding anything to the contrary, each Party's aggregate liability under this Agreement shall not exceed the fees paid or payable in the twelve (12) months preceding the claim.'",
    citationHints: ["Indian Contract Act 1872 | s.73 | 1872"],
    confidence: 0.9,
  };
};

export const capTooLow: RuleFn = ({ lower }) => {
  if (!ZERO_CAP.test(lower)) return null;
  return {
    ruleId: "lol.cap_too_low",
    level: "high",
    issue: "Liability cap is effectively zero or nominal.",
    explanation:
      "A cap of zero, one rupee or similar nominal amount may be challenged as an unfair contract term and as failing to provide reasonable compensation under Indian Contract Act §74 [CITE: Indian Contract Act 1872 | s.74 | 1872].",
    suggestion:
      "Replace the nominal cap with a fees-based formula (e.g., 12 months of fees paid) and preserve carve-outs for fraud, gross negligence, IP infringement and DPDP/data-protection breaches.",
    citationHints: ["Indian Contract Act 1872 | s.74 | 1872"],
    confidence: 0.9,
  };
};

export const noConsequentialExclusion: RuleFn = ({ lower }) => {
  if (EXCLUDES_CONSEQUENTIAL.test(lower)) return null;
  return {
    ruleId: "lol.no_consequential_exclusion",
    level: "medium",
    issue: "No exclusion for consequential or indirect damages.",
    explanation:
      "Without an express exclusion of consequential, indirect, incidental, special and punitive damages, the cap may be eroded by claims for remote losses; Indian Contract Act §73 already excludes 'remote and indirect' loss but contracts typically reinforce this expressly [CITE: Indian Contract Act 1872 | s.73 | 1872].",
    suggestion:
      "Add: 'In no event shall either Party be liable for any consequential, indirect, incidental, special, punitive or exemplary damages, or for loss of profits, revenue, business, goodwill or data.'",
    citationHints: ["Indian Contract Act 1872 | s.73 | 1872"],
    confidence: 0.7,
  };
};

export const noCarveOuts: RuleFn = ({ lower }) => {
  if (!HAS_CAP.test(lower)) return null;
  if (HAS_CARVE_OUT.test(lower)) return null;
  return {
    ruleId: "lol.no_carveouts",
    level: "medium",
    issue: "Liability cap lacks standard carve-outs.",
    explanation:
      "A cap that applies to fraud, gross negligence, wilful misconduct, indemnities, confidentiality breach, IP infringement or DPDP-mandated obligations is unfair to the non-breaching party and may not survive scrutiny.",
    suggestion:
      "Add a carve-out: 'The foregoing cap shall not apply to (a) breach of confidentiality, (b) indemnification obligations, (c) breach of the Digital Personal Data Protection Act 2023 [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023], (d) fraud, gross negligence or wilful misconduct, or (e) infringement of intellectual property rights.'",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.8 | 2023"],
    confidence: 0.7,
    needsLlm: true,
  };
};

export const limitationOfLiabilityRules: RuleFn[] = [
  uncappedLiability,
  capTooLow,
  noConsequentialExclusion,
  noCarveOuts,
];
