import type { RuleFn } from "../types";

const HAS_ASSIGNMENT = /\b(?:assign(?:s|ed|ment)?|transfer(?:s|red)?|vest(?:s|ed)?|convey(?:s|ed)?)\b[\s\S]{0,80}\b(?:intellectual\s+property|ip|copyright|patent|trademark|work(?:s)?|deliverable)/i;
const HAS_WORK_FOR_HIRE = /\b(?:work\s+for\s+hire|made\s+for\s+hire|work\s+made\s+in\s+the\s+course\s+of\s+(?:employment|service))\b/i;
const HAS_MORAL_RIGHTS_WAIVER = /\b(?:moral\s+rights?|right\s+of\s+(?:paternity|integrity)|special\s+rights?\s+under\s+section\s+57)\b[\s\S]{0,40}\b(?:waiv(?:e|ed|er)|relinquish|not\s+assert)/i;
const HAS_FUTURE_IP = /\b(?:future\s+(?:works?|inventions?|deliverables?)|all\s+(?:works?|inventions?|deliverables?)\s+(?:created|developed|produced)\s+(?:hereunder|under\s+this\s+agreement))\b/i;
const HAS_BACKGROUND_IP = /\b(?:background\s+(?:ip|intellectual\s+property|technology)|pre[-\s]?existing\s+(?:ip|intellectual\s+property))\b/i;

export const noWorkForHire: RuleFn = ({ lower }) => {
  if (!HAS_ASSIGNMENT.test(lower)) return null;
  if (HAS_WORK_FOR_HIRE.test(lower)) return null;
  return {
    ruleId: "ip.no_work_for_hire",
    level: "medium",
    issue: "No 'work for hire' or first-ownership clarification.",
    explanation:
      "Under Copyright Act 1957 §17, the author is generally the first owner of copyright; the employer is the first owner only for works made in the course of employment under a contract of service. Without express assignment language, a vendor's work product may not vest in the customer [CITE: Copyright Act 1957 | s.17 | 1957].",
    suggestion:
      "Add: 'All Deliverables created by the Service Provider in the course of providing the Services shall be deemed to be works made for hire and, to the extent any rights do not vest by operation of law, the Service Provider hereby irrevocably assigns to the Customer all right, title and interest in such Deliverables.'",
    citationHints: ["Copyright Act 1957 | s.17 | 1957"],
    confidence: 0.8,
  };
};

export const noMoralRightsWaiver: RuleFn = ({ lower }) => {
  if (!HAS_ASSIGNMENT.test(lower)) return null;
  if (HAS_MORAL_RIGHTS_WAIVER.test(lower)) return null;
  return {
    ruleId: "ip.no_moral_rights_waiver",
    level: "medium",
    issue: "No moral-rights waiver from the author.",
    explanation:
      "Copyright Act §57 grants authors enduring moral rights (paternity and integrity) which cannot be assigned. Without an express waiver, an author can object to derogatory treatment of the work even after assignment [CITE: Copyright Act 1957 | s.57 | 1957].",
    suggestion:
      "Add: 'To the maximum extent permitted by law, the author waives all moral rights under Section 57 of the Copyright Act 1957 in respect of the Deliverables and shall procure equivalent waivers from each individual contributor.'",
    citationHints: ["Copyright Act 1957 | s.57 | 1957"],
    confidence: 0.75,
  };
};

export const noFutureIpAssignment: RuleFn = ({ lower }) => {
  if (!HAS_ASSIGNMENT.test(lower)) return null;
  if (HAS_FUTURE_IP.test(lower)) return null;
  return {
    ruleId: "ip.no_future_ip",
    level: "low",
    issue: "Assignment does not expressly capture future works.",
    explanation:
      "An assignment limited to existing works leaves later-developed deliverables in a grey zone. Indian commercial practice expressly captures future works created in the course of the engagement.",
    suggestion:
      "Clarify scope: 'This assignment applies to all Deliverables, whether existing on the Effective Date or created at any time during the term, and to all derivative works thereof.'",
    citationHints: ["Copyright Act 1957 | s.17 | 1957"],
    confidence: 0.65,
  };
};

export const noBackgroundIpCarveOut: RuleFn = ({ lower }) => {
  if (!HAS_ASSIGNMENT.test(lower)) return null;
  if (HAS_BACKGROUND_IP.test(lower)) return null;
  return {
    ruleId: "ip.no_background_ip_carveout",
    level: "low",
    issue: "No carve-out for background or pre-existing IP.",
    explanation:
      "A blanket assignment without a background-IP carve-out can inadvertently transfer ownership of the vendor's pre-existing tools, libraries and frameworks to the customer.",
    suggestion:
      "Add: 'Background IP owned or licensed by either Party prior to the Effective Date shall remain the exclusive property of that Party. The Service Provider grants the Customer a non-exclusive, perpetual licence to use such Background IP solely as embedded in the Deliverables.'",
    citationHints: [],
    confidence: 0.65,
  };
};

export const ipAssignmentRules: RuleFn[] = [
  noWorkForHire,
  noMoralRightsWaiver,
  noFutureIpAssignment,
  noBackgroundIpCarveOut,
];
