import type { RuleFn } from "../types";

const HAS_JURISDICTION_TERM = /\b(?:jurisdiction|courts?\s+(?:at|of|in)|forum|venue)\b/i;
const FOREIGN_FORUM = /\b(?:singapore|london|new\s+york|delaware|switzerland|hong\s+kong|dubai|paris|courts?\s+of\s+(?:england|scotland|new\s+york|delaware|singapore))\b/i;
const HAS_ARBITRATION = /\b(?:arbitration|arbitral\s+tribunal|sole\s+arbitrator)\b/i;
const HAS_INDIAN_FORUM = /\b(?:courts?\s+(?:at|of|in)\s+(?:mumbai|new\s+delhi|delhi|bengaluru|bangalore|chennai|kolkata|hyderabad|ahmedabad|gurgaon|gurugram|noida|pune)|courts?\s+of\s+india|indian\s+courts?)\b/i;
const NON_EXCLUSIVE = /\bnon[-\s]exclusive\s+jurisdiction\b/i;

export const foreignForumNoArbitration: RuleFn = ({ lower }) => {
  if (!HAS_JURISDICTION_TERM.test(lower)) return null;
  if (!FOREIGN_FORUM.test(lower)) return null;
  if (HAS_ARBITRATION.test(lower)) return null;
  return {
    ruleId: "juris.foreign_no_arbitration",
    level: "high",
    issue: "Exclusive foreign forum without arbitration carve-out.",
    explanation:
      "Submitting an Indian-party dispute exclusively to a foreign court raises enforceability concerns under the Code of Civil Procedure §13 and may face challenges in execution. An arbitration seat (typically Indian) under the Arbitration and Conciliation Act 1996 is the market alternative [CITE: Arbitration and Conciliation Act 1996 | s.20 | 1996].",
    suggestion:
      "Replace exclusive foreign forum with arbitration seated in India: 'Any dispute arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in [Mumbai/New Delhi] under the Arbitration and Conciliation Act 1996.'",
    citationHints: ["Arbitration and Conciliation Act 1996 | s.20 | 1996"],
    confidence: 0.85,
  };
};

export const noJurisdictionAtAll: RuleFn = ({ lower }) => {
  if (HAS_JURISDICTION_TERM.test(lower)) return null;
  if (HAS_ARBITRATION.test(lower)) return null;
  return {
    ruleId: "juris.missing",
    level: "missing",
    issue: "No forum or dispute resolution mechanism specified.",
    explanation:
      "Without a clear jurisdiction or arbitration clause, parties default to general principles of forum convenience under the Code of Civil Procedure, leading to costly forum-selection disputes.",
    suggestion:
      "Add an exclusive Indian forum or arbitration seat: 'Subject to clause [Arbitration], the courts at [Mumbai] shall have exclusive jurisdiction over any dispute arising out of this Agreement.'",
    citationHints: [],
    confidence: 0.8,
  };
};

export const nonExclusiveJurisdiction: RuleFn = ({ lower }) => {
  if (!NON_EXCLUSIVE.test(lower)) return null;
  return {
    ruleId: "juris.non_exclusive",
    level: "medium",
    issue: "Non-exclusive jurisdiction allows parallel proceedings.",
    explanation:
      "Non-exclusive jurisdiction permits either party to commence proceedings in any competent forum, increasing the risk of parallel suits and inconsistent judgments. Indian commercial practice favours exclusive jurisdiction or a sole arbitration seat.",
    suggestion:
      "Convert to exclusive jurisdiction: 'The courts at [city] shall have exclusive jurisdiction in respect of any dispute arising out of or in connection with this Agreement.'",
    citationHints: [],
    confidence: 0.7,
  };
};

export const indianForumGood: RuleFn = ({ lower }) => {
  if (!HAS_INDIAN_FORUM.test(lower)) return null;
  if (FOREIGN_FORUM.test(lower)) return null;
  if (NON_EXCLUSIVE.test(lower)) return null;
  return {
    ruleId: "juris.indian_exclusive",
    level: "low",
    issue: "Indian exclusive forum specified.",
    explanation:
      "The clause vests exclusive jurisdiction in an Indian court, consistent with market practice for Indian commercial contracts.",
    suggestion:
      "Consider whether an arbitration seat (Indian) under the Arbitration and Conciliation Act 1996 would better suit cross-border counterparties [CITE: Arbitration and Conciliation Act 1996 | s.20 | 1996].",
    citationHints: ["Arbitration and Conciliation Act 1996 | s.20 | 1996"],
    confidence: 0.7,
  };
};

export const jurisdictionRules: RuleFn[] = [
  foreignForumNoArbitration,
  noJurisdictionAtAll,
  nonExclusiveJurisdiction,
  indianForumGood,
];
