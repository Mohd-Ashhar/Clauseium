import type { RuleFn } from "../types";

const MENTIONS_INDEMNITY = /\b(?:indemnif(?:y|ies|ied|ication)|hold\s+harmless|defend)\b/i;
const MUTUAL = /\b(?:each\s+party|both\s+parties|mutual(?:ly)?|reciprocal)\b/i;
const HAS_CAP_REFERENCE = /\b(?:cap|limited\s+to|subject\s+to\s+the\s+limitation)\b/i;
const COVERS_THIRD_PARTY = /\b(?:third[-\s]party\s+claims?|claims?\s+by\s+third\s+parties)\b/i;
const COVERS_IP_INFRINGEMENT = /\b(?:intellectual\s+property|ip|patent|trademark|copyright)\b[\s\S]{0,80}\b(?:infring|misappropriat)/i;

export const oneSidedIndemnity: RuleFn = ({ lower }) => {
  if (!MENTIONS_INDEMNITY.test(lower)) return null;
  if (MUTUAL.test(lower)) return null;
  return {
    ruleId: "indem.one_sided",
    level: "high",
    issue: "Indemnity appears one-sided (no mutuality).",
    explanation:
      "The indemnity is owed by one party only with no reciprocal obligation. Mutual indemnification is the SaaS market norm in India and asymmetry shifts unbounded risk without consideration. Asymmetric indemnities also expose the indemnified loss recovery to disproportionate-penalty challenges under [CITE: Indian Contract Act 1872 | s.74 | 1872].",
    suggestion:
      "Convert to mutual: 'Each Party shall indemnify, defend and hold harmless the other Party against third-party claims arising from (a) breach of this Agreement, (b) gross negligence or wilful misconduct, and (c) infringement of intellectual property rights.'",
    citationHints: ["Indian Contract Act 1872 | s.74 | 1872"],
    confidence: 0.8,
    needsLlm: true,
  };
};

export const indemnityNoIpCoverage: RuleFn = ({ lower }) => {
  if (!MENTIONS_INDEMNITY.test(lower)) return null;
  if (COVERS_IP_INFRINGEMENT.test(lower)) return null;
  return {
    ruleId: "indem.no_ip_infringement",
    level: "medium",
    issue: "Indemnity does not cover IP infringement claims.",
    explanation:
      "Standard SaaS indemnities cover third-party claims that the service or deliverables infringe Indian or foreign IP rights. Omitting IP coverage exposes the customer to enforcement risk under the Copyright Act 1957 and Patents Act 1970 [CITE: Copyright Act 1957 | s.17 | 1957].",
    suggestion:
      "Add a dedicated IP indemnity covering claims that the Service infringes any third-party patent, copyright, trademark or trade-secret, with an obligation to procure rights, modify or refund.",
    citationHints: ["Copyright Act 1957 | s.17 | 1957"],
    confidence: 0.65,
  };
};

export const indemnityUncapped: RuleFn = ({ lower }) => {
  if (!MENTIONS_INDEMNITY.test(lower)) return null;
  if (HAS_CAP_REFERENCE.test(lower)) return null;
  return {
    ruleId: "indem.uncapped",
    level: "medium",
    issue: "Indemnity is not subject to any liability cap or super-cap.",
    explanation:
      "Indian commercial practice typically subjects indemnity payouts to a super-cap (e.g., 2x or 3x annual fees). A wholly uncapped indemnity exposes the indemnifying party to unbounded damages under Indian Contract Act §73 [CITE: Indian Contract Act 1872 | s.73 | 1872].",
    suggestion:
      "Add: 'Notwithstanding clause [Liability], each Party's aggregate liability under the indemnification obligations shall not exceed two (2) times the fees paid in the preceding twelve (12) months.'",
    citationHints: ["Indian Contract Act 1872 | s.73 | 1872"],
    confidence: 0.7,
  };
};

export const indemnityNoThirdPartyTrigger: RuleFn = ({ lower }) => {
  if (!MENTIONS_INDEMNITY.test(lower)) return null;
  if (COVERS_THIRD_PARTY.test(lower)) return null;
  return {
    ruleId: "indem.no_third_party_trigger",
    level: "low",
    issue: "Indemnity trigger is unclear (no reference to third-party claims).",
    explanation:
      "Indemnities should be triggered by third-party claims, not by the indemnified party's own losses; otherwise the clause overlaps with general liability and may be construed as a disproportionate penalty under [CITE: Indian Contract Act 1872 | s.74 | 1872].",
    suggestion:
      "Clarify: 'The indemnifying Party shall defend the indemnified Party against any third-party claim, suit or proceeding arising from …'",
    citationHints: ["Indian Contract Act 1872 | s.74 | 1872"],
    confidence: 0.6,
  };
};

export const indemnificationRules: RuleFn[] = [
  oneSidedIndemnity,
  indemnityNoIpCoverage,
  indemnityUncapped,
  indemnityNoThirdPartyTrigger,
];
