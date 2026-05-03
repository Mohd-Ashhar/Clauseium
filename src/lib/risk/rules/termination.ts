import type { RuleFn } from "../types";

const HAS_NOTICE = /\b(?:notice\s+(?:of|period)|\d{1,3}\s*(?:days?|weeks?|months?)\b[\s\S]{0,40}\b(?:notice|prior\s+written|in\s+writing))/i;
const HAS_FOR_CAUSE = /\b(?:for\s+cause|material\s+breach|default|insolvency|bankruptcy|liquidation)\b/i;
const HAS_FOR_CONVENIENCE = /\b(?:for\s+convenience|without\s+cause|at\s+any\s+time\s+(?:by|on)\s+notice)\b/i;
const HAS_CURE_PERIOD = /\b(?:cure\s+period|opportunity\s+to\s+cure|fail(?:s|ed)?\s+to\s+(?:cure|remedy)|within\s+\d{1,3}\s*(?:days?)\b[\s\S]{0,40}\b(?:cure|remedy))/i;
const HAS_SURVIVAL = /\b(?:surviv(?:e|al)|continue\s+(?:to\s+apply|in\s+full\s+force)\s+(?:after|notwithstanding)\s+(?:termination|expiry))\b/i;

export const noNoticePeriod: RuleFn = ({ lower }) => {
  if (HAS_NOTICE.test(lower)) return null;
  return {
    ruleId: "term.no_notice",
    level: "medium",
    issue: "No notice period for termination.",
    explanation:
      "A termination right that is exercisable without notice deprives the counterparty of an opportunity to wind down operations and may be challenged as unfair under the Indian Contract Act framework on reasonable conduct [CITE: Indian Contract Act 1872 | s.73 | 1872].",
    suggestion:
      "Add: 'Either Party may terminate this Agreement for convenience by giving thirty (30) days' prior written notice to the other Party.'",
    citationHints: ["Indian Contract Act 1872 | s.73 | 1872"],
    confidence: 0.75,
  };
};

export const noCurePeriod: RuleFn = ({ lower }) => {
  if (!HAS_FOR_CAUSE.test(lower)) return null;
  if (HAS_CURE_PERIOD.test(lower)) return null;
  return {
    ruleId: "term.no_cure_period",
    level: "medium",
    issue: "Termination for cause has no cure period.",
    explanation:
      "Indian commercial practice requires a notice and an opportunity to cure (typically 30 days for material breach) before termination for cause. Immediate termination on alleged breach exposes the terminating party to wrongful-termination damages under Indian Contract Act §73.",
    suggestion:
      "Add: 'A Party may terminate this Agreement for material breach by the other Party only if such breach is not cured within thirty (30) days of receipt of written notice describing the breach in reasonable detail.'",
    citationHints: ["Indian Contract Act 1872 | s.73 | 1872"],
    confidence: 0.75,
  };
};

export const noSurvival: RuleFn = ({ lower }) => {
  if (HAS_SURVIVAL.test(lower)) return null;
  return {
    ruleId: "term.no_survival",
    level: "medium",
    issue: "No survival of confidentiality, IP, indemnity or DPDP obligations.",
    explanation:
      "Termination of the Agreement should not extinguish accrued rights, confidentiality, IP assignment, indemnification, limitation of liability or DPDP obligations. Without an express survival clause, post-termination enforcement becomes uncertain.",
    suggestion:
      "Add: 'The provisions of clauses [Confidentiality], [IP], [Indemnification], [Limitation of Liability] and [Data Protection] shall survive any termination or expiry of this Agreement.'",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.8 | 2023"],
    confidence: 0.75,
  };
};

export const noForCauseTermination: RuleFn = ({ lower }) => {
  if (HAS_FOR_CAUSE.test(lower)) return null;
  if (!HAS_FOR_CONVENIENCE.test(lower)) return null;
  return {
    ruleId: "term.no_for_cause",
    level: "medium",
    issue: "Only termination for convenience; no for-cause right.",
    explanation:
      "Without a clear for-cause termination right (material breach, insolvency, change of control), the non-breaching party has no immediate exit on counterparty default and is forced to wait out the convenience-notice period.",
    suggestion:
      "Add: 'Either Party may terminate this Agreement immediately on written notice if (a) the other Party commits a material breach not cured within thirty (30) days, or (b) the other Party becomes insolvent, files for bankruptcy or has a liquidator appointed.'",
    citationHints: [],
    confidence: 0.7,
  };
};

export const terminationRules: RuleFn[] = [
  noNoticePeriod,
  noCurePeriod,
  noSurvival,
  noForCauseTermination,
];
