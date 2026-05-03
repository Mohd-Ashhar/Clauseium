import type { RuleFn } from "../types";

const HAS_BREACH_NOTICE = /\b(?:personal\s+data\s+breach|breach\s+of\s+(?:personal\s+)?data|data\s+breach)\b[\s\S]{0,80}\b(?:notif|inform|report|72\s*hours?|seventy[-\s]two\s+hours?|without\s+undue\s+delay)/i;
const HAS_DATA_PRINCIPAL_RIGHTS = /\b(?:data\s+principal|right\s+to\s+(?:access|correction|erasure|grievance|nominate)|grievance\s+redressal)\b/i;
const HAS_PURPOSE_LIMITATION = /\b(?:specified\s+purpose|purpose[s]?\s+(?:set\s+out|stated|specified)|legitimate\s+use|necessary\s+for)\b/i;
const HAS_FIDUCIARY_ROLE = /\b(?:data\s+fiduciary|data\s+processor|significant\s+data\s+fiduciary|controller|processor)\b/i;
const MENTIONS_TRANSFER = /\b(?:transfer|share|disclose|host|store|process)\b[\s\S]{0,60}\b(?:outside\s+india|cross[-\s]border|abroad|overseas|foreign\s+country|notified\s+country)/i;
const HAS_TRANSFER_SAFEGUARD = /\b(?:notified\s+country|standard\s+contractual\s+clauses|sccs?|adequacy|approved\s+jurisdiction|central\s+government\s+notif)/i;
const HAS_BUNDLED_CONSENT = /\b(?:bundled?\s+consent|combined\s+consent|tied\s+consent|deemed\s+consent\b(?![\s\S]{0,40}\bemploy))/i;

export const dpdpNoBreachNotice: RuleFn = ({ lower }) => {
  if (HAS_BREACH_NOTICE.test(lower)) return null;
  return {
    ruleId: "dpdp.no_breach_notice",
    level: "high",
    issue: "No personal-data breach notification timeline.",
    explanation:
      "DPDP Act §8(6) obliges a Data Fiduciary to notify the Board and each affected Data Principal of a personal-data breach. The clause must specify a clear notification timeline (e.g., without undue delay, in any event within 72 hours) [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
    suggestion:
      "Add: 'In the event of a personal-data breach, the Data Fiduciary shall notify the Data Protection Board and each affected Data Principal without undue delay and in any event within seventy-two (72) hours of becoming aware of the breach.'",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.8 | 2023"],
    confidence: 0.85,
  };
};

export const dpdpNoDataPrincipalRights: RuleFn = ({ lower }) => {
  if (HAS_DATA_PRINCIPAL_RIGHTS.test(lower)) return null;
  return {
    ruleId: "dpdp.no_data_principal_rights",
    level: "medium",
    issue: "No mechanism for Data Principal rights (access, correction, erasure, grievance).",
    explanation:
      "DPDP Act §11–13 grant Data Principals the rights to access, correction, erasure and grievance redressal. The clause does not create operational mechanisms to honour these rights [CITE: Digital Personal Data Protection Act 2023 | s.11 | 2023] [CITE: Digital Personal Data Protection Act 2023 | s.13 | 2023].",
    suggestion:
      "Add: 'The Data Fiduciary shall provide a readily available means for the Data Principal to (i) obtain a summary of personal data processed, (ii) request correction or erasure, and (iii) raise grievances which shall be addressed within the period prescribed under DPDP Rules.'",
    citationHints: [
      "Digital Personal Data Protection Act 2023 | s.11 | 2023",
      "Digital Personal Data Protection Act 2023 | s.13 | 2023",
    ],
    confidence: 0.8,
  };
};

export const dpdpNoPurposeLimitation: RuleFn = ({ lower }) => {
  if (HAS_PURPOSE_LIMITATION.test(lower)) return null;
  return {
    ruleId: "dpdp.no_purpose_limitation",
    level: "medium",
    issue: "Processing purpose is not specified.",
    explanation:
      "DPDP Act requires personal data to be processed for a 'specified purpose' for which the Data Principal has given consent. A clause that permits open-ended processing is non-compliant [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
    suggestion:
      "Add: 'The Data Fiduciary shall process personal data solely for the specified purposes set out in Schedule [X] and shall not use such personal data for any other purpose without obtaining fresh consent from the Data Principal.'",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.8 | 2023"],
    confidence: 0.7,
  };
};

export const dpdpNoFiduciaryRole: RuleFn = ({ lower }) => {
  if (HAS_FIDUCIARY_ROLE.test(lower)) return null;
  return {
    ruleId: "dpdp.no_fiduciary_role",
    level: "medium",
    issue: "Roles of Data Fiduciary and Data Processor are not allocated.",
    explanation:
      "DPDP Act allocates compliance obligations primarily to the Data Fiduciary and contractual obligations to any Data Processor it engages. A clause that does not identify each party's role creates ambiguity over who bears statutory obligations [CITE: Digital Personal Data Protection Act 2023 | s.8 | 2023].",
    suggestion:
      "Add: 'For the purposes of the Digital Personal Data Protection Act 2023, [Customer] shall be the Data Fiduciary and [Vendor] shall act as a Data Processor processing personal data only on documented instructions of the Data Fiduciary.'",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.8 | 2023"],
    confidence: 0.75,
    needsLlm: true,
  };
};

export const dpdpCrossBorderNoSafeguard: RuleFn = ({ lower }) => {
  if (!MENTIONS_TRANSFER.test(lower)) return null;
  if (HAS_TRANSFER_SAFEGUARD.test(lower)) return null;
  return {
    ruleId: "dpdp.cross_border_no_safeguard",
    level: "high",
    issue: "Cross-border transfer permitted without statutory safeguards.",
    explanation:
      "DPDP Act §16 empowers the Central Government to restrict transfers of personal data to countries it has not notified. Permitting cross-border transfer without referencing the notified-country regime or contractual safeguards is non-compliant [CITE: Digital Personal Data Protection Act 2023 | s.16 | 2023].",
    suggestion:
      "Add: 'Personal data shall not be transferred outside India to any country other than those notified by the Central Government under Section 16 of the Digital Personal Data Protection Act 2023, and any such transfer shall be subject to standard contractual safeguards approved by the Data Fiduciary.'",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.16 | 2023"],
    confidence: 0.85,
  };
};

export const dpdpConsentBundling: RuleFn = ({ lower }) => {
  if (!HAS_BUNDLED_CONSENT.test(lower)) return null;
  return {
    ruleId: "dpdp.consent_bundling",
    level: "high",
    issue: "Consent appears bundled or tied to other terms.",
    explanation:
      "DPDP Act §6 requires consent to be free, specific, informed, unconditional and unambiguous, and to be given through a clear affirmative action. Bundled or tied consent is invalid [CITE: Digital Personal Data Protection Act 2023 | s.6 | 2023].",
    suggestion:
      "Restructure to obtain consent through a separable, affirmative action distinct from acceptance of the Agreement, with the right to withdraw consent at the same ease as it was given.",
    citationHints: ["Digital Personal Data Protection Act 2023 | s.6 | 2023"],
    confidence: 0.85,
  };
};

export const dataProtectionDpdpRules: RuleFn[] = [
  dpdpNoBreachNotice,
  dpdpNoDataPrincipalRights,
  dpdpNoPurposeLimitation,
  dpdpNoFiduciaryRole,
  dpdpCrossBorderNoSafeguard,
  dpdpConsentBundling,
];
