import type { ExpectedClause, Playbook } from "./types";

// Reusable expected-clause definitions. The `match` regexes run against the
// full lowercased document text, so they catch a protection wherever it lives
// (including schedules/annexures). Phrasings are intentionally broad.

const limitationOfLiability: ExpectedClause = {
  key: "limitation_of_liability",
  label: "Limitation of liability",
  importance: "required",
  match: [
    /limitation of liability/,
    /in no event shall .* be liable/,
    /aggregate liability .* shall not exceed/,
    /total liability .* (?:capped|limited)/,
  ],
  missingRisk: "high",
  whyItMatters:
    "Without a liability cap, exposure is unlimited. Indian courts award damages under s.73 of the Contract Act; an express cap is the primary commercial protection.",
};

const indemnity: ExpectedClause = {
  key: "indemnification",
  label: "Indemnity",
  importance: "required",
  match: [/indemnif(?:y|ication|ies|ied)/, /hold harmless/, /defend .* against .* claims/],
  missingRisk: "high",
  whyItMatters:
    "Absent an indemnity, a party bears third-party claim costs (IP infringement, data breach) it did not cause.",
};

const confidentiality: ExpectedClause = {
  key: "confidentiality",
  label: "Confidentiality",
  importance: "required",
  match: [/confidential(?:ity)?/, /non-?disclosure/, /proprietary information/],
  missingRisk: "high",
  whyItMatters:
    "No confidentiality obligation leaves shared business information unprotected once disclosed.",
};

const termination: ExpectedClause = {
  key: "termination",
  label: "Termination rights",
  importance: "required",
  match: [/terminat(?:e|ion)/, /right to terminate/, /terminate (?:for|upon)/],
  missingRisk: "high",
  whyItMatters:
    "Without express termination rights, a party can be locked into an unworkable arrangement with no clean exit.",
};

const governingLaw: ExpectedClause = {
  key: "governing_law",
  label: "Governing law",
  importance: "required",
  match: [/governing law/, /governed by the laws of/, /construed in accordance with the laws/],
  missingRisk: "medium",
  whyItMatters:
    "An unspecified governing law creates uncertainty over which legal system interprets the contract.",
};

const disputeResolution: ExpectedClause = {
  key: "dispute_resolution",
  label: "Dispute resolution / arbitration",
  importance: "required",
  match: [/arbitrat(?:ion|or)/, /dispute resolution/, /jurisdiction of the courts/, /exclusive jurisdiction/],
  missingRisk: "medium",
  whyItMatters:
    "No dispute-resolution mechanism defaults parties to ordinary litigation, often slower and in an unintended forum. The Arbitration & Conciliation Act 1996 governs Indian-seated arbitration.",
};

const dataProtection: ExpectedClause = {
  key: "data_protection_dpdp",
  label: "Data protection (DPDP)",
  importance: "required",
  match: [
    /data protection/,
    /personal data/,
    /dpdp/,
    /digital personal data protection/,
    /data fiduciary/,
    /data processor/,
  ],
  missingRisk: "high",
  whyItMatters:
    "Where personal data is handled, the DPDP Act 2023 imposes obligations (consent, purpose limitation, breach notice). Their absence is a compliance gap.",
};

const ipOwnership: ExpectedClause = {
  key: "ip_assignment",
  label: "IP ownership / assignment",
  importance: "required",
  match: [
    /intellectual property/,
    /\bip\b .* (?:own|assign)/,
    /work(?:s)? made for hire/,
    /assigns? .* (?:rights|title)/,
    /ownership of (?:deliverables|work product)/,
  ],
  missingRisk: "high",
  whyItMatters:
    "Without an IP assignment, ownership of deliverables/work product is ambiguous and may default to the creator under the Copyright Act 1957.",
};

const paymentTerms: ExpectedClause = {
  key: "payment_terms",
  label: "Payment terms",
  importance: "required",
  match: [/payment terms/, /shall pay .* within/, /invoic(?:e|ing)/, /fees? (?:payable|shall be)/],
  missingRisk: "medium",
  whyItMatters:
    "Undefined payment timing invites disputes; the MSMED Act 2006 implies 45-day limits for covered suppliers.",
};

const warranties: ExpectedClause = {
  key: "representations_warranties",
  label: "Representations & warranties",
  importance: "recommended",
  match: [/represent(?:s|ation)/, /warrant(?:y|ies|s)/, /covenants? that/],
  missingRisk: "medium",
  whyItMatters:
    "Warranties allocate risk for quality, authority and compliance; their absence weakens recourse for defective performance.",
};

const forceMajeure: ExpectedClause = {
  key: "force_majeure",
  label: "Force majeure",
  importance: "recommended",
  match: [/force majeure/, /acts? of god/, /beyond .* reasonable control/],
  missingRisk: "low",
  whyItMatters:
    "Without force majeure, a party may be in breach for non-performance caused by events outside its control.",
};

const nonCompete: ExpectedClause = {
  key: "non_compete",
  label: "Non-compete / non-solicitation",
  importance: "recommended",
  match: [/non-?compete/, /non-?solicit/, /shall not .* solicit/, /restraint of trade/],
  missingRisk: "low",
  whyItMatters:
    "Restrictive covenants protect the business; note s.27 of the Contract Act makes post-term non-competes largely unenforceable in India.",
};

const insurance: ExpectedClause = {
  key: "insurance",
  label: "Insurance",
  importance: "recommended",
  match: [/insurance/, /maintain .* coverage/, /policy of insurance/],
  missingRisk: "low",
  whyItMatters:
    "Insurance requirements back-stop indemnities with real recoverability.",
};

const stampDuty: ExpectedClause = {
  key: "stamp_duty",
  label: "Stamping / stamp duty",
  importance: "recommended",
  match: [
    /stamp duty/,
    /duly stamped/,
    /adequately stamped/,
    /payment of stamp/,
    /stamped in accordance/,
  ],
  missingRisk: "medium",
  whyItMatters:
    "An instrument not duly stamped is inadmissible in evidence and cannot be acted upon under s.35 of the Indian Stamp Act 1899 until the duty and penalty are paid. The agreement should allocate responsibility for stamping; the applicable duty is state-specific.",
};

const noticePeriod: ExpectedClause = {
  key: "notice",
  label: "Notices",
  importance: "recommended",
  match: [/notice(?:s)? (?:shall|must|to be)/, /written notice/, /address for notices/],
  missingRisk: "low",
  whyItMatters:
    "A notices clause ensures formal communications (termination, breach) are validly served.",
};

export const PLAYBOOKS: Record<string, Playbook> = {
  msa: {
    type: "msa",
    label: "Master Services Agreement",
    expected: [
      limitationOfLiability,
      indemnity,
      confidentiality,
      termination,
      governingLaw,
      disputeResolution,
      ipOwnership,
      paymentTerms,
      dataProtection,
      warranties,
      forceMajeure,
      insurance,
      stampDuty,
      noticePeriod,
    ],
  },
  nda: {
    type: "nda",
    label: "Non-Disclosure Agreement",
    expected: [
      confidentiality,
      { ...termination, missingRisk: "medium" },
      governingLaw,
      disputeResolution,
      ipOwnership,
      { ...indemnity, importance: "recommended", missingRisk: "medium" },
      noticePeriod,
    ],
  },
  sow: {
    type: "sow",
    label: "Statement of Work",
    expected: [
      paymentTerms,
      ipOwnership,
      { ...termination, missingRisk: "medium" },
      warranties,
      confidentiality,
      limitationOfLiability,
    ],
  },
  saas: {
    type: "saas",
    label: "SaaS / Subscription Agreement",
    expected: [
      limitationOfLiability,
      indemnity,
      dataProtection,
      confidentiality,
      termination,
      paymentTerms,
      governingLaw,
      disputeResolution,
      warranties,
      forceMajeure,
      noticePeriod,
    ],
  },
  employment: {
    type: "employment",
    label: "Employment Agreement",
    expected: [
      confidentiality,
      ipOwnership,
      { ...termination, missingRisk: "high" },
      nonCompete,
      paymentTerms,
      governingLaw,
      noticePeriod,
      dataProtection,
    ],
  },
  vendor: {
    type: "vendor",
    label: "Vendor / Supply Agreement",
    expected: [
      limitationOfLiability,
      indemnity,
      paymentTerms,
      warranties,
      termination,
      confidentiality,
      governingLaw,
      disputeResolution,
      insurance,
      forceMajeure,
      stampDuty,
    ],
  },
  consulting: {
    type: "consulting",
    label: "Consulting Agreement",
    expected: [
      ipOwnership,
      confidentiality,
      paymentTerms,
      termination,
      limitationOfLiability,
      nonCompete,
      governingLaw,
      warranties,
      stampDuty,
    ],
  },
  lease: {
    type: "lease",
    label: "Lease / Leave & Licence",
    expected: [
      paymentTerms,
      { ...termination, missingRisk: "high" },
      governingLaw,
      disputeResolution,
      insurance,
      noticePeriod,
      forceMajeure,
      { ...stampDuty, missingRisk: "high" },
    ],
  },
  generic: {
    type: "generic",
    label: "Commercial Agreement",
    expected: [
      limitationOfLiability,
      indemnity,
      confidentiality,
      termination,
      governingLaw,
      disputeResolution,
      paymentTerms,
      ipOwnership,
      dataProtection,
      stampDuty,
    ],
  },
};

export function playbookFor(type: string): Playbook {
  return PLAYBOOKS[type] ?? PLAYBOOKS.generic;
}
