import type { RuleFn } from "../types";

const HAS_GOVERNING_LAW = /\b(?:governed\s+by|construed\s+in\s+accordance\s+with|subject\s+to\s+the\s+laws?\s+of)\b/i;
const INDIAN_LAW = /\b(?:laws?\s+of\s+(?:the\s+republic\s+of\s+)?india|indian\s+law)\b/i;
const NON_INDIAN_LAW = /\b(?:laws?\s+of\s+(?:singapore|england\s+(?:and\s+wales)?|new\s+york|delaware|switzerland|hong\s+kong|the\s+state\s+of\s+(?:california|new\s+york|delaware)|the\s+united\s+states))\b/i;

export const noGoverningLaw: RuleFn = ({ lower }) => {
  if (HAS_GOVERNING_LAW.test(lower)) return null;
  return {
    ruleId: "gl.missing",
    level: "missing",
    issue: "No governing law specified.",
    explanation:
      "Without an express choice of law, the proper law of the contract is determined by closest-connection principles, leading to uncertainty. Indian commercial contracts conventionally elect Indian law under the Indian Contract Act 1872 [CITE: Indian Contract Act 1872 | s.10 | 1872].",
    suggestion:
      "Add: 'This Agreement shall be governed by and construed in accordance with the laws of the Republic of India, without regard to its conflict of laws principles.'",
    citationHints: ["Indian Contract Act 1872 | s.10 | 1872"],
    confidence: 0.85,
  };
};

export const nonIndianGoverningLaw: RuleFn = ({ lower }) => {
  if (!HAS_GOVERNING_LAW.test(lower)) return null;
  if (INDIAN_LAW.test(lower)) return null;
  if (!NON_INDIAN_LAW.test(lower)) return null;
  return {
    ruleId: "gl.non_indian",
    level: "medium",
    issue: "Foreign governing law selected without basis.",
    explanation:
      "A foreign governing law for an Indian-party contract may be enforceable but introduces conflict-of-laws complexity, requires proof of foreign law in Indian proceedings, and may not displace mandatory Indian statutes such as the DPDP Act 2023, Arbitration Act 1996 or FEMA 1999 [CITE: Indian Contract Act 1872 | s.28 | 1872].",
    suggestion:
      "Justify the foreign-law election in writing or replace with Indian law: 'This Agreement shall be governed by the laws of the Republic of India.' Carve out mandatory Indian statutes if foreign law is retained.",
    citationHints: ["Indian Contract Act 1872 | s.28 | 1872"],
    confidence: 0.75,
    needsLlm: true,
  };
};

export const indianGoverningLawGood: RuleFn = ({ lower }) => {
  if (!INDIAN_LAW.test(lower)) return null;
  return {
    ruleId: "gl.indian",
    level: "standard",
    issue: "Indian law selected as governing law.",
    explanation:
      "The clause selects the laws of India consistent with market practice for Indian commercial contracts and avoids enforcement frictions for mandatory Indian statutes.",
    suggestion: "",
    citationHints: [],
    confidence: 0.8,
  };
};

export const governingLawRules: RuleFn[] = [
  noGoverningLaw,
  nonIndianGoverningLaw,
  indianGoverningLawGood,
];
