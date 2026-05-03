import type { ClauseAnalysis, DocumentSection } from "@/types/contract";

// ---------------------------------------------------------------------------
// VENDOR MSA — TechCo × Acme Cloud (ctr_001)
// Full structured document with ~30 sections; flagged sections link to
// ClauseAnalysis IDs so cards and document stay in lockstep.
// ---------------------------------------------------------------------------

export const msaDocumentSections: DocumentSection[] = [
  // Recitals
  {
    sectionNumber: "",
    title: "Recitals",
    isHeading: true,
    content:
      "WHEREAS, the Service Provider is engaged in the business of providing cloud-based software services and related professional services in India; and WHEREAS, the Customer wishes to procure such services on the terms set out herein. NOW, THEREFORE, in consideration of the mutual covenants and agreements set out below, the parties agree as follows:",
  },

  // 1. Definitions
  {
    sectionNumber: "1",
    title: "Definitions and Interpretation",
    isHeading: true,
    content:
      '1.1 "Agreement" means this Master Services Agreement together with all Schedules and SOWs executed hereunder.\n1.2 "Affiliate" means, in relation to a party, any entity that controls, is controlled by, or is under common control with such party.\n1.3 "Confidential Information" means all non-public information of a party in any form, including business, technical, financial and customer information.\n1.4 "Customer Data" means any data, content or information provided by or on behalf of the Customer to the Service Provider in connection with the Services.\n1.5 "Data Principal" has the meaning given under the Digital Personal Data Protection Act, 2023.\n1.6 "DPDP Act" means the Digital Personal Data Protection Act, 2023 and the rules and regulations thereunder.\n1.7 "Effective Date" means the date of last signature on this Agreement.\n1.8 "Personal Data" has the meaning given under the DPDP Act, 2023.\n1.9 "Services" means the cloud-based software services and related professional services described in the applicable SOW.\n1.10 "SOW" means a Statement of Work executed by the parties under this Agreement.',
  },

  // 2. Scope
  {
    sectionNumber: "2",
    title: "Scope of Services",
    content:
      "The Service Provider shall provide the Services described in each SOW executed by the parties. Each SOW shall be deemed to incorporate the terms of this Agreement. In the event of conflict between this Agreement and an SOW, this Agreement shall prevail except where the SOW expressly provides otherwise.",
  },

  // 5. Payment Terms (medium risk)
  {
    sectionNumber: "5.1",
    title: "Payment Terms",
    clauseId: "cl_009",
    riskLevel: "medium",
    content:
      "Customer shall pay all undisputed invoices within ninety (90) days of the invoice date. All amounts are exclusive of applicable taxes including GST, which shall be borne by the Customer.",
    highlights: [
      { text: "ninety (90) days of the invoice date", riskLevel: "medium" },
    ],
  },

  // 8. Data Protection (high risk)
  {
    sectionNumber: "8",
    title: "Data Protection",
    isHeading: true,
    content:
      "The parties shall comply with applicable data protection laws including the DPDP Act, 2023 in connection with the processing of Personal Data under this Agreement.",
  },
  {
    sectionNumber: "8.3",
    title: "Personal Data Obligations",
    clauseId: "cl_002",
    riskLevel: "high",
    content:
      "The Service Provider shall implement reasonable security practices to protect Personal Data processed under this Agreement and shall comply with applicable data protection laws.",
    highlights: [
      { text: "reasonable security practices", riskLevel: "high" },
      { text: "applicable data protection laws", riskLevel: "high" },
    ],
  },

  // 9. IP Assignment (medium)
  {
    sectionNumber: "9.1",
    title: "Intellectual Property Rights",
    clauseId: "cl_007",
    riskLevel: "medium",
    content:
      "All intellectual property rights in deliverables created by the Service Provider in the course of performing the Services shall be assigned to the Customer upon payment in full.",
    highlights: [
      { text: "intellectual property rights in deliverables", riskLevel: "medium" },
    ],
  },

  // 11.3 Non-compete (medium)
  {
    sectionNumber: "11.3",
    title: "Non-compete",
    clauseId: "cl_008",
    riskLevel: "medium",
    content:
      "For a period of twenty-four (24) months following termination, the Customer shall not engage any competitor of the Service Provider for similar services within India.",
    highlights: [
      { text: "twenty-four (24) months", riskLevel: "medium" },
      { text: "within India", riskLevel: "medium" },
    ],
  },

  // 12.1 Indemnification (high)
  {
    sectionNumber: "12.1",
    title: "Indemnification",
    clauseId: "cl_003",
    riskLevel: "high",
    content:
      "The Customer shall indemnify, defend and hold harmless the Service Provider from and against any and all third-party claims, damages, losses and expenses arising out of or in connection with the Customer's use of the Services.",
    highlights: [
      {
        text: "The Customer shall indemnify, defend and hold harmless the Service Provider",
        riskLevel: "high",
      },
    ],
  },

  // 13.1 Insurance (medium)
  {
    sectionNumber: "13.1",
    title: "Insurance",
    clauseId: "cl_011",
    riskLevel: "medium",
    content:
      "The Service Provider shall maintain commercial general liability insurance of not less than INR 5,00,00,000.",
    highlights: [
      { text: "commercial general liability insurance", riskLevel: "medium" },
    ],
  },

  // 14.2 Limitation of Liability (high)
  {
    sectionNumber: "14",
    title: "Limitation of Liability",
    isHeading: true,
    content:
      "Each party's liability under or in connection with this Agreement shall be limited as set out in this Section 14.",
  },
  {
    sectionNumber: "14.2",
    title: "Aggregate Liability Cap",
    clauseId: "cl_001",
    riskLevel: "high",
    content:
      "Notwithstanding anything to the contrary, the aggregate liability of the Service Provider arising out of or in connection with this Agreement shall not exceed an amount equal to three (3) months of fees paid by the Customer in the twelve (12) months preceding the event giving rise to the claim.",
    highlights: [
      {
        text: "three (3) months of fees paid by the Customer in the twelve (12) months preceding the event giving rise to the claim",
        riskLevel: "high",
      },
    ],
  },

  // 16.4 Auto-renewal (high)
  {
    sectionNumber: "16.4",
    title: "Auto-renewal",
    clauseId: "cl_004",
    riskLevel: "high",
    content:
      "This Agreement shall automatically renew for successive periods of one (1) year unless either Party provides written notice of non-renewal at least ninety (90) days prior to the expiration of the then-current term.",
    highlights: [
      { text: "automatically renew", riskLevel: "high" },
      { text: "ninety (90) days", riskLevel: "high" },
    ],
  },

  // 17.2 Force Majeure (medium)
  {
    sectionNumber: "17.2",
    title: "Force Majeure",
    clauseId: "cl_010",
    riskLevel: "medium",
    content:
      "Neither Party shall be liable for delay or failure to perform due to causes beyond its reasonable control, including acts of God, war, and natural disasters.",
    highlights: [
      { text: "acts of God, war, and natural disasters", riskLevel: "medium" },
    ],
  },

  // 21. Governing Law / Arbitration (medium)
  {
    sectionNumber: "21.1",
    title: "Governing Law",
    clauseId: "cl_005",
    riskLevel: "medium",
    content:
      "This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of laws principles.",
    highlights: [
      { text: "laws of India", riskLevel: "medium" },
    ],
  },
  {
    sectionNumber: "21.2",
    title: "Arbitration",
    clauseId: "cl_006",
    riskLevel: "medium",
    content:
      "Any dispute arising out of this Agreement shall be referred to and finally resolved by arbitration administered by the Singapore International Arbitration Centre (SIAC) in accordance with the SIAC Rules then in force.",
    highlights: [
      {
        text: "Singapore International Arbitration Centre (SIAC)",
        riskLevel: "medium",
      },
    ],
  },

  // Missing clauses — flagged as gaps
  {
    sectionNumber: "—",
    title: "Anti-Bribery & Anti-Corruption (Missing)",
    clauseId: "cl_miss_001",
    riskLevel: "missing",
    content:
      "[Missing: No representation referencing the Prevention of Corruption Act, 1988. Standard ABAC language is recommended for vendor agreements.]",
  },
  {
    sectionNumber: "—",
    title: "POSH Compliance (Missing)",
    clauseId: "cl_miss_002",
    riskLevel: "missing",
    content:
      "[Missing: No POSH (Sexual Harassment of Women at Workplace Act, 2013) compliance representation. Recommended where vendor personnel interact with Customer employees.]",
  },
];

// ---------------------------------------------------------------------------
// SaaS Subscription Agreement — Razorpay (ctr_002)
// 22 clauses (2 high, 5 medium, 7 low, 8 standard, 0 missing)
// ---------------------------------------------------------------------------

export const saasClauses: ClauseAnalysis[] = [
  // 2 HIGH
  {
    id: "saas_cl_001",
    clauseNumber: "14.2",
    category: "limitation_of_liability",
    title: "Limitation of Liability",
    originalText:
      "Notwithstanding clause 14.1, the aggregate liability of either party shall be limited to the fees paid in the preceding three (3) months, except for liability arising from gross negligence or wilful misconduct.",
    riskLevel: "high",
    summary:
      "3-month liability cap is below the 12-month Indian SaaS market standard.",
    reasoning:
      "Standard Indian B2B SaaS practice is a 12-month cap with carve-outs for IP infringement, data protection, and confidentiality breaches.",
    suggestedRedline:
      "Notwithstanding clause 14.1, the aggregate liability of either party shall be limited to the fees paid in the preceding twelve (12) months, except for liability arising from (a) infringement of intellectual property, (b) breach of confidentiality, (c) breach of obligations under the DPDP Act, 2023, or (d) gross negligence or wilful misconduct.",
    citations: [
      {
        id: "saas_cit_001",
        text: "§73, Indian Contract Act, 1872",
        source: "Indian Contract Act, 1872",
        section: "73",
        status: "verified",
      },
    ],
    confidence: 95,
    isFromPlaybook: true,
    marketPosition: "below",
  },
  {
    id: "saas_cl_002",
    clauseNumber: "8.2",
    category: "data_protection_dpdp",
    title: "Data Protection",
    originalText:
      "The Service Provider shall process Customer Data in accordance with applicable data protection laws.",
    riskLevel: "high",
    summary:
      "No specific DPDP Act 2023 obligations or DPA reference — material gap.",
    reasoning:
      "The clause does not reference the DPDP Act, 2023 or annex a Data Processing Agreement. Sub-processor approval and breach notification timelines are missing.",
    suggestedRedline:
      "The Service Provider shall process Customer Data only on documented instructions of the Customer, comply with §8 of the DPDP Act, 2023, notify breaches within 24 hours, and execute the Data Processing Agreement annexed as Schedule D.",
    citations: [
      {
        id: "saas_cit_002",
        text: "§8(1), DPDP Act, 2023",
        source: "Digital Personal Data Protection Act, 2023",
        section: "8(1)",
        status: "verified",
      },
    ],
    confidence: 96,
    isFromPlaybook: true,
    marketPosition: "below",
  },

  // 5 MEDIUM
  {
    id: "saas_cl_003",
    clauseNumber: "2.2",
    category: "termination",
    title: "Auto-renewal",
    originalText:
      "This Agreement shall automatically renew for successive twelve (12) month periods unless terminated by either party on sixty (60) days' notice.",
    riskLevel: "medium",
    summary: "Silent auto-renewal with 60-day exit window.",
    reasoning:
      "Indian B2B SaaS norm is a 30-day exit window with affirmative consent required for renewal.",
    suggestedRedline:
      "This Agreement shall renew for successive twelve (12) month periods only upon the Customer's written affirmative consent provided not less than thirty (30) days prior to expiration.",
    citations: [
      {
        id: "saas_cit_003",
        text: "§2(46), Consumer Protection Act, 2019",
        source: "Consumer Protection Act, 2019",
        section: "2(46)",
        status: "partially_verified",
      },
    ],
    confidence: 88,
    isFromPlaybook: true,
    marketPosition: "below",
  },
  {
    id: "saas_cl_004",
    clauseNumber: "4.2",
    category: "payment_terms",
    title: "Payment Terms",
    originalText:
      "Customer shall pay all invoices within forty-five (45) days of the invoice date.",
    riskLevel: "medium",
    summary: "Net-45 is at market but no MSME carve-out.",
    reasoning:
      "Net-45 aligns with the MSMED Act, 2006 cap, but the clause lacks an explicit MSME carve-out.",
    citations: [
      {
        id: "saas_cit_004",
        text: "§15, MSMED Act, 2006",
        source: "MSMED Act, 2006",
        section: "15",
        status: "verified",
      },
    ],
    confidence: 84,
    isFromPlaybook: false,
    marketPosition: "at",
  },
  {
    id: "saas_cl_005",
    clauseNumber: "9.1",
    category: "ip_assignment",
    title: "IP Assignment",
    originalText:
      "All deliverables created under this Agreement shall be the property of the Customer.",
    riskLevel: "medium",
    summary: "No carve-out for Service Provider's pre-existing IP.",
    reasoning:
      "Without a Background IP carve-out, the clause may sweep in the Service Provider's underlying platform IP.",
    suggestedRedline:
      "All deliverables specifically created for the Customer shall be the property of the Customer; the Service Provider's pre-existing IP, tools and methodologies shall remain its property.",
    citations: [],
    confidence: 86,
    isFromPlaybook: true,
    marketPosition: "below",
  },
  {
    id: "saas_cl_006",
    clauseNumber: "15.2",
    category: "arbitration",
    title: "Arbitration",
    originalText:
      "Any dispute arising out of or in connection with this Agreement shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with the seat at Bengaluru.",
    riskLevel: "medium",
    summary: "Domestic seat is correct; institutional administration not specified.",
    reasoning:
      "Ad-hoc arbitration in India is workable but institutional administration (MCIA / DIAC) reduces enforcement risk.",
    citations: [
      {
        id: "saas_cit_005",
        text: "§20, Arbitration Act, 1996",
        source: "Arbitration and Conciliation Act, 1996",
        section: "20",
        status: "verified",
      },
    ],
    confidence: 82,
    isFromPlaybook: false,
    marketPosition: "at",
  },
  {
    id: "saas_cl_007",
    clauseNumber: "11.1",
    category: "termination",
    title: "Termination for Convenience",
    originalText:
      "Either party may terminate this Agreement for convenience on ninety (90) days' written notice.",
    riskLevel: "medium",
    summary: "90 days is long for a SaaS contract; 30 days is more typical.",
    reasoning: "A 90-day exit creates procurement friction. Customer may want flexibility to switch vendors faster.",
    citations: [],
    confidence: 80,
    isFromPlaybook: false,
    marketPosition: "below",
  },

  // 7 LOW + 8 STANDARD = 15 well-drafted clauses
  ...generateStandardClauses("saas", [
    { num: "1.1", title: "Definitions", riskLevel: "low" },
    { num: "1.2", title: "Interpretation", riskLevel: "low" },
    { num: "3.1", title: "Scope of Services", riskLevel: "low" },
    { num: "6.1", title: "Service Levels", riskLevel: "low" },
    { num: "7.1", title: "Confidentiality", riskLevel: "low" },
    { num: "10.1", title: "Warranties", riskLevel: "low" },
    { num: "12.1", title: "Notices", riskLevel: "low" },
    { num: "13.1", title: "Assignment", riskLevel: "standard" },
    { num: "13.2", title: "Severability", riskLevel: "standard" },
    { num: "13.3", title: "Waiver", riskLevel: "standard" },
    { num: "13.4", title: "Entire Agreement", riskLevel: "standard" },
    { num: "13.5", title: "Counterparts", riskLevel: "standard" },
    { num: "13.6", title: "Survival", riskLevel: "standard" },
    { num: "13.7", title: "Independent Contractor", riskLevel: "standard" },
    { num: "13.8", title: "No Third-Party Beneficiaries", riskLevel: "standard" },
  ]),
];

export const saasDocumentSections: DocumentSection[] = [
  {
    sectionNumber: "",
    title: "Recitals",
    isHeading: true,
    content:
      "WHEREAS, Razorpay Software Pvt Ltd is engaged in providing payment processing and related SaaS services; and WHEREAS, the Customer wishes to subscribe to such services. NOW, THEREFORE, the parties agree as follows:",
  },
  {
    sectionNumber: "1",
    title: "Definitions and Interpretation",
    isHeading: true,
    content:
      '1.1 "Agreement" means this Master Services Agreement and all Schedules.\n1.2 "Confidential Information" means non-public information disclosed by either party.\n1.3 "Customer Data" means data provided by Customer to the Service Provider.\n1.4 "Data Principal" has the meaning under the DPDP Act, 2023.\n1.5 "Effective Date" means the date of last signature.\n1.6 "Personal Data" has the meaning under the DPDP Act, 2023.\n1.7 "Services" means the SaaS services described in Schedule A.\n1.8 "Subscription Term" means the term set out in the Order Form.',
  },
  {
    sectionNumber: "2",
    title: "Term and Renewal",
    isHeading: true,
    content:
      "2.1 This Agreement commences on the Effective Date and shall continue for the Subscription Term set out in the Order Form.",
  },
  {
    sectionNumber: "2.2",
    title: "Auto-renewal",
    clauseId: "saas_cl_003",
    riskLevel: "medium",
    content:
      "This Agreement shall automatically renew for successive twelve (12) month periods unless terminated by either party on sixty (60) days' notice.",
    highlights: [
      { text: "automatically renew", riskLevel: "medium" },
      { text: "sixty (60) days' notice", riskLevel: "medium" },
    ],
  },
  {
    sectionNumber: "3",
    title: "Scope of Services",
    content:
      "The Service Provider shall provide the Services described in Schedule A. The Customer's use of the Services shall be subject to the Acceptable Use Policy.",
  },
  {
    sectionNumber: "4",
    title: "Fees and Payment",
    isHeading: true,
    content: "4.1 Customer shall pay the fees as set out in Schedule A.",
  },
  {
    sectionNumber: "4.2",
    title: "Payment Terms",
    clauseId: "saas_cl_004",
    riskLevel: "medium",
    content:
      "Customer shall pay all invoices within forty-five (45) days of the invoice date.",
    highlights: [
      { text: "forty-five (45) days", riskLevel: "medium" },
    ],
  },
  {
    sectionNumber: "8",
    title: "Data Protection",
    isHeading: true,
    content:
      "8.1 The Service Provider shall process Customer Data in accordance with applicable data protection laws.",
  },
  {
    sectionNumber: "8.2",
    title: "Personal Data Obligations",
    clauseId: "saas_cl_002",
    riskLevel: "high",
    content:
      "The Service Provider shall process Customer Data in accordance with applicable data protection laws.",
    highlights: [
      { text: "applicable data protection laws", riskLevel: "high" },
    ],
  },
  {
    sectionNumber: "9.1",
    title: "Intellectual Property",
    clauseId: "saas_cl_005",
    riskLevel: "medium",
    content:
      "All deliverables created under this Agreement shall be the property of the Customer.",
    highlights: [
      { text: "All deliverables created under this Agreement shall be the property of the Customer", riskLevel: "medium" },
    ],
  },
  {
    sectionNumber: "11.1",
    title: "Termination for Convenience",
    clauseId: "saas_cl_007",
    riskLevel: "medium",
    content:
      "Either party may terminate this Agreement for convenience on ninety (90) days' written notice.",
    highlights: [
      { text: "ninety (90) days' written notice", riskLevel: "medium" },
    ],
  },
  {
    sectionNumber: "14",
    title: "Liability",
    isHeading: true,
    content:
      "14.1 Each party shall indemnify and hold harmless the other party from third-party claims arising out of breach of this Agreement.",
  },
  {
    sectionNumber: "14.2",
    title: "Limitation of Liability",
    clauseId: "saas_cl_001",
    riskLevel: "high",
    content:
      "Notwithstanding clause 14.1, the aggregate liability of either party shall be limited to the fees paid in the preceding three (3) months, except for liability arising from gross negligence or wilful misconduct.",
    highlights: [
      {
        text: "limited to the fees paid in the preceding three (3) months",
        riskLevel: "high",
      },
    ],
  },
  {
    sectionNumber: "15",
    title: "Governing Law and Jurisdiction",
    isHeading: true,
    content:
      "15.1 This Agreement shall be governed by and construed in accordance with the laws of India and the courts at Bengaluru shall have exclusive jurisdiction.",
  },
  {
    sectionNumber: "15.2",
    title: "Arbitration",
    clauseId: "saas_cl_006",
    riskLevel: "medium",
    content:
      "Any dispute arising out of or in connection with this Agreement shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with the seat at Bengaluru.",
    highlights: [
      { text: "the seat at Bengaluru", riskLevel: "medium" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lighter clause sets for remaining contracts. These match each contract's
// existing riskSummary so the FilterBar shows correct counts.
// ---------------------------------------------------------------------------

interface ClauseSeed {
  num: string;
  title: string;
  category?: ClauseAnalysis["category"];
  riskLevel: ClauseAnalysis["riskLevel"];
  originalText?: string;
  summary?: string;
  reasoning?: string;
  suggestedRedline?: string;
  citation?: { text: string; source: string; section: string };
}

function buildClause(prefix: string, idx: number, seed: ClauseSeed): ClauseAnalysis {
  const baseText =
    seed.originalText ??
    `${seed.title} clause as drafted is consistent with market-standard Indian commercial practice and our internal playbook.`;
  const baseSummary =
    seed.summary ??
    (seed.riskLevel === "high"
      ? "Material deviation from playbook — partner sign-off recommended."
      : seed.riskLevel === "medium"
        ? "Moderate deviation from market standard — review recommended."
        : seed.riskLevel === "missing"
          ? "Standard clause is missing from this Agreement — recommended to add."
          : "Market-standard drafting; no changes required.");
  return {
    id: `${prefix}_cl_${idx.toString().padStart(3, "0")}`,
    clauseNumber: seed.num,
    category: seed.category ?? "confidentiality",
    title: seed.title,
    originalText: baseText,
    riskLevel: seed.riskLevel,
    summary: baseSummary,
    reasoning:
      seed.reasoning ??
      (seed.riskLevel === "standard" || seed.riskLevel === "low"
        ? "This clause aligns with the firm's playbook and the 50th-percentile drafting in our benchmark corpus."
        : "Clause deviates from the firm's playbook for this contract type. Review recommended."),
    suggestedRedline: seed.suggestedRedline,
    citations: seed.citation
      ? [
          {
            id: `${prefix}_cit_${idx.toString().padStart(3, "0")}`,
            text: seed.citation.text,
            source: seed.citation.source,
            section: seed.citation.section,
            status: "verified",
          },
        ]
      : [],
    confidence: seed.riskLevel === "standard" || seed.riskLevel === "low" ? 95 : 88,
    isFromPlaybook: true,
    marketPosition:
      seed.riskLevel === "high" || seed.riskLevel === "medium" ? "below" : "at",
  };
}

function generateStandardClauses(prefix: string, seeds: ClauseSeed[]): ClauseAnalysis[] {
  return seeds.map((s, i) => buildClause(prefix, 1000 + i, s));
}

function buildClauseSet(prefix: string, seeds: ClauseSeed[]): ClauseAnalysis[] {
  return seeds.map((s, i) => buildClause(prefix, i + 1, s));
}

// ctr_003: NDA — Project Garuda (0H, 1M, 5L, 6S, 0Miss = 12)
export const ndaClauses: ClauseAnalysis[] = buildClauseSet("nda", [
  {
    num: "5.1",
    title: "Term of Confidentiality",
    category: "confidentiality",
    riskLevel: "medium",
    originalText:
      "The obligations of confidentiality under this Agreement shall continue for a period of five (5) years from the date of disclosure.",
    summary: "5-year term is standard; trade-secret carve-out not specified.",
    reasoning:
      "5 years matches Indian M&A NDA practice. However, no perpetual carve-out for trade secrets is included.",
    citation: {
      text: "§27, Indian Contract Act, 1872",
      source: "Indian Contract Act, 1872",
      section: "27",
    },
  },
  { num: "1.1", title: "Definitions", riskLevel: "low" },
  { num: "2.1", title: "Confidential Information", riskLevel: "low" },
  { num: "3.1", title: "Permitted Use", riskLevel: "low" },
  { num: "4.1", title: "Return of Materials", riskLevel: "low" },
  { num: "6.1", title: "No Licence Granted", riskLevel: "low" },
  { num: "7.1", title: "Notices", riskLevel: "standard" },
  { num: "8.1", title: "Governing Law", riskLevel: "standard" },
  { num: "9.1", title: "Severability", riskLevel: "standard" },
  { num: "10.1", title: "Counterparts", riskLevel: "standard" },
  { num: "11.1", title: "Entire Agreement", riskLevel: "standard" },
  { num: "12.1", title: "Amendment", riskLevel: "standard" },
]);

// ctr_005: Cloud Infrastructure (3H, 4M, 6L, 10S, 1Miss = 24 explicit; total 28)
export const cloudClauses: ClauseAnalysis[] = buildClauseSet("cloud", [
  // 3 high
  {
    num: "11.2",
    title: "Cross-border Data Transfer",
    category: "data_protection_dpdp",
    riskLevel: "high",
    originalText:
      "Customer Data may be transferred to and processed in any jurisdiction in which AWS or its Affiliates operate.",
    summary: "Unrestricted cross-border transfer conflicts with DPDP §16 review.",
    reasoning:
      "§16 of the DPDP Act, 2023 requires evaluation of destination jurisdictions. Blanket transfer rights are non-compliant.",
    suggestedRedline:
      "Customer Data shall not be transferred outside India except to jurisdictions approved by the Customer in writing and consistent with §16 of the DPDP Act, 2023.",
    citation: {
      text: "§16, DPDP Act, 2023",
      source: "Digital Personal Data Protection Act, 2023",
      section: "16",
    },
  },
  {
    num: "14.1",
    title: "Limitation of Liability",
    category: "limitation_of_liability",
    riskLevel: "high",
    originalText:
      "AWS's aggregate liability shall not exceed the fees paid in the preceding six (6) months.",
    summary: "6-month cap is below 12-month market standard for cloud infrastructure.",
    reasoning: "Cloud-infra contracts typically include carve-outs for IP and data breach. Cap is too narrow given the volumes processed.",
    citation: {
      text: "§73, Indian Contract Act, 1872",
      source: "Indian Contract Act, 1872",
      section: "73",
    },
  },
  {
    num: "8.4",
    title: "Breach Notification",
    category: "data_protection_dpdp",
    riskLevel: "high",
    originalText:
      "AWS shall notify Customer of security incidents within a reasonable time.",
    summary: '"Reasonable time" is too vague — DPDP rules require 72-hour notification.',
    reasoning: "DPDP Rules 2025 require notification within 72 hours of discovery. The clause must specify a hard timeline.",
    suggestedRedline:
      "AWS shall notify Customer of any Personal Data breach within twenty-four (24) hours of discovery and provide a detailed report within seventy-two (72) hours.",
    citation: {
      text: "§8(6), DPDP Act, 2023",
      source: "Digital Personal Data Protection Act, 2023",
      section: "8(6)",
    },
  },
  // 4 medium
  {
    num: "5.1",
    title: "Service Level Agreement",
    category: "representations_warranties",
    riskLevel: "medium",
    originalText: "AWS targets 99.5% monthly uptime.",
    summary: "99.5% uptime is below typical enterprise cloud SLAs (99.95%+).",
    reasoning: "Mission-critical workloads typically require 99.95% or higher with corresponding service credits.",
  },
  {
    num: "6.2",
    title: "Termination Assistance",
    category: "termination",
    riskLevel: "medium",
    originalText: "AWS will provide reasonable assistance to Customer during transition for up to thirty (30) days post-termination.",
    summary: "30-day transition window is short for a complex cloud migration.",
    reasoning: "Standard practice is 90-180 days of transition assistance for enterprise cloud agreements.",
  },
  {
    num: "9.3",
    title: "Subcontracting",
    category: "data_protection_dpdp",
    riskLevel: "medium",
    originalText: "AWS may engage subcontractors at its discretion.",
    summary: "Sub-processor approval rights for the Customer are missing.",
    reasoning: "DPDP Act requires Data Fiduciary oversight of sub-processors. Customer should retain approval rights.",
  },
  {
    num: "12.1",
    title: "Audit Rights",
    category: "representations_warranties",
    riskLevel: "medium",
    originalText: "Customer may request a third-party audit report annually.",
    summary: "Audit limited to third-party reports; no direct audit right.",
    reasoning: "For regulated industries, direct audit rights (with notice) are commonly required.",
  },
  // 1 missing
  {
    num: "—",
    title: "Data Localisation",
    category: "data_protection_dpdp",
    riskLevel: "missing",
    originalText: "(Not present in this Agreement.)",
    summary: "No data localisation provision — required for regulated workloads.",
    reasoning: "RBI and SEBI-regulated workloads have data localisation requirements that should be expressly addressed.",
  },
  // 16 low/standard
  ...Array.from({ length: 16 }, (_, i) => {
    const titles = [
      "Definitions",
      "Service Description",
      "Acceptable Use",
      "Account Management",
      "Pricing",
      "Taxes",
      "Confidentiality",
      "Publicity",
      "Force Majeure",
      "Notices",
      "Severability",
      "Waiver",
      "Assignment",
      "Counterparts",
      "Governing Law",
      "Entire Agreement",
    ];
    return {
      num: `${i + 1}.0`,
      title: titles[i],
      riskLevel: i < 6 ? "low" : ("standard" as const),
    } as ClauseSeed;
  }),
]);

// ctr_006: Consulting Services Agreement (1H, 3M, 6L, 9S, 0Miss = 19)
export const consultingClauses: ClauseAnalysis[] = buildClauseSet("consult", [
  {
    num: "10.1",
    title: "IP Assignment",
    category: "ip_assignment",
    riskLevel: "high",
    originalText:
      "All work product, including pre-existing materials of Deloitte, shall vest in the Customer upon payment.",
    summary: "Sweeps in Deloitte's pre-existing IP — likely unenforceable and over-broad.",
    reasoning:
      "Pre-existing methodologies and tools should not transfer. Standard practice is Foreground/Background IP separation.",
    suggestedRedline:
      "Foreground IP specifically created for the Customer shall vest in the Customer; Deloitte's pre-existing materials and methodologies shall remain its property.",
    citation: {
      text: "§17, Copyright Act, 1957",
      source: "Copyright Act, 1957",
      section: "17",
    },
  },
  {
    num: "5.1",
    title: "Fees",
    category: "payment_terms",
    riskLevel: "medium",
    originalText: "Fees are billed monthly in arrears, payable within sixty (60) days.",
    summary: "Net-60 is at the upper end of acceptable for consulting engagements.",
    reasoning: "Indian consulting market typically uses Net-30 to Net-45.",
  },
  {
    num: "8.1",
    title: "Personnel",
    category: "representations_warranties",
    riskLevel: "medium",
    originalText: "Deloitte may substitute personnel at its discretion.",
    summary: "No key personnel commitment — risk of substitution mid-engagement.",
    reasoning: "Customer should secure commitment to key personnel and a substitution approval right.",
  },
  {
    num: "11.1",
    title: "Confidentiality",
    category: "confidentiality",
    riskLevel: "medium",
    originalText: "Confidentiality obligations expire three (3) years after termination.",
    summary: "3 years is shorter than the 5-year market standard for consulting.",
    reasoning: "Trade-secret information should have a perpetual carve-out.",
  },
  ...Array.from({ length: 15 }, (_, i) => {
    const titles = [
      "Engagement Scope",
      "Deliverables",
      "Acceptance",
      "Timelines",
      "Cooperation",
      "Subcontractors",
      "Insurance",
      "Termination",
      "Governing Law",
      "Notices",
      "Severability",
      "Waiver",
      "Counterparts",
      "Survival",
      "Entire Agreement",
    ];
    return {
      num: `${i + 12}.0`,
      title: titles[i],
      riskLevel: i < 6 ? "low" : ("standard" as const),
    } as ClauseSeed;
  }),
]);

// ctr_007: DPA — Freshworks (5H, 6M, 2L, 2S, 0Miss = 15 explicit + buffer for 24 total)
export const dpaClauses: ClauseAnalysis[] = buildClauseSet("dpa", [
  // 5 high
  {
    num: "3.1",
    title: "Sub-processor Engagement",
    category: "data_protection_dpdp",
    riskLevel: "high",
    originalText: "Freshworks may engage sub-processors without prior notice to Customer.",
    summary: "Violates DPDP §8 sub-processor approval requirements.",
    reasoning: "Data Fiduciary must approve sub-processors before engagement.",
    citation: {
      text: "§8, DPDP Act, 2023",
      source: "Digital Personal Data Protection Act, 2023",
      section: "8",
    },
  },
  {
    num: "4.2",
    title: "Cross-border Transfer",
    category: "data_protection_dpdp",
    riskLevel: "high",
    originalText: "Personal Data may be transferred to the United States and other Freshworks data centres.",
    summary: "Unrestricted transfer to US conflicts with DPDP §16 review.",
    reasoning: "§16 requires Customer evaluation of destination jurisdictions.",
  },
  {
    num: "6.1",
    title: "Breach Notification",
    category: "data_protection_dpdp",
    riskLevel: "high",
    originalText: "Freshworks will notify Customer of breaches within seven (7) days.",
    summary: "7-day notification breaches DPDP Rules 2025 (72-hour requirement).",
    reasoning: "DPDP Rules 2025 require notification within 72 hours of discovery.",
  },
  {
    num: "7.3",
    title: "Data Principal Rights",
    category: "data_protection_dpdp",
    riskLevel: "high",
    originalText: "Freshworks will respond to Data Principal requests at its discretion.",
    summary: '"At its discretion" violates §11–§14 of the DPDP Act.',
    reasoning: "Data Processor must assist Customer in fulfilling Data Principal rights — not exercise discretion.",
  },
  {
    num: "9.1",
    title: "Liability for Data Breach",
    category: "limitation_of_liability",
    riskLevel: "high",
    originalText: "Freshworks's liability for any data breach is capped at INR 50,00,000.",
    summary: "Fixed cap of ₹50L is materially inadequate for data-protection liability.",
    reasoning: "Data breach exposure under DPDP Act includes regulatory penalties up to ₹250 crore — cap should reflect this.",
  },
  // 6 medium
  {
    num: "2.1",
    title: "Processing Instructions",
    category: "data_protection_dpdp",
    riskLevel: "medium",
    originalText: "Freshworks shall process data in accordance with this Agreement.",
    summary: "Should explicitly require processing only on documented instructions.",
    reasoning: "DPDP §8 requires processing only on documented instructions of the Data Fiduciary.",
  },
  {
    num: "5.1",
    title: "Security Measures",
    category: "data_protection_dpdp",
    riskLevel: "medium",
    originalText: "Freshworks implements industry-standard security measures.",
    summary: '"Industry-standard" is vague — should reference DPDP §8(5) safeguards.',
    reasoning: "Specific security controls (encryption, access control, audit logs) should be enumerated.",
  },
  {
    num: "8.1",
    title: "Audit Rights",
    category: "representations_warranties",
    riskLevel: "medium",
    originalText: "Freshworks will provide an annual SOC 2 report.",
    summary: "Limited to SOC 2 — direct audit right is restricted.",
    reasoning: "For regulated industries, on-site audit rights are commonly required.",
  },
  {
    num: "10.1",
    title: "Return / Deletion of Data",
    category: "data_protection_dpdp",
    riskLevel: "medium",
    originalText: "Upon termination, Freshworks will delete data within ninety (90) days.",
    summary: "90-day window is long; 30 days is more typical.",
    reasoning: "DPDP Act and customer policy typically require deletion within 30 days of termination.",
  },
  {
    num: "11.1",
    title: "Confidentiality",
    category: "confidentiality",
    riskLevel: "medium",
    originalText: "Confidentiality obligations expire two (2) years post-termination.",
    summary: "2 years is shorter than standard DPA practice.",
    reasoning: "Standard DPAs typically have 5-year confidentiality with perpetual trade-secret carve-out.",
  },
  {
    num: "12.1",
    title: "Indemnification",
    category: "indemnification",
    riskLevel: "medium",
    originalText: "Each party shall indemnify the other for breach of this DPA.",
    summary: "Generic mutual indemnification; specific data-breach indemnity is not carved out.",
    reasoning: "DPAs should include a specific Service Provider indemnity for data breaches caused by its negligence.",
  },
  // 4 low/standard explicit
  ...Array.from({ length: 13 }, (_, i) => {
    const titles = [
      "Definitions",
      "Scope of DPA",
      "Term",
      "Notices",
      "Severability",
      "Governing Law",
      "Counterparts",
      "Assignment",
      "Waiver",
      "Entire Agreement",
      "Amendment",
      "Survival",
      "No Third-Party Beneficiaries",
    ];
    return {
      num: `${i + 13}.0`,
      title: titles[i],
      riskLevel: i < 2 ? "low" : ("standard" as const),
    } as ClauseSeed;
  }),
]);

// ctr_008: Partnership Agreement — PhonePe (1H, 2M, 5L, 6S, 0Miss = 14 explicit, 26 total)
export const partnershipClauses: ClauseAnalysis[] = buildClauseSet("part", [
  {
    num: "8.1",
    title: "Revenue Share",
    category: "payment_terms",
    riskLevel: "high",
    originalText: "Revenue share is 70/30 in favour of PhonePe.",
    summary: "70/30 split is materially below market for FinTech partnerships.",
    reasoning: "Typical FinTech partnership splits range from 50/50 to 60/40.",
    suggestedRedline: "Revenue share shall be 60/40 in favour of PhonePe with a tiered structure based on volume thresholds.",
  },
  {
    num: "5.2",
    title: "Exclusivity",
    category: "non_compete",
    riskLevel: "medium",
    originalText: "Customer grants exclusivity to PhonePe for similar services in India for three (3) years.",
    summary: "3-year exclusivity is long; standard is 18-24 months with renewal milestones.",
    reasoning: "Long exclusivity without performance milestones limits Customer's optionality.",
  },
  {
    num: "11.1",
    title: "RBI Compliance",
    category: "data_protection_dpdp",
    riskLevel: "medium",
    originalText: "Both parties shall comply with applicable RBI regulations.",
    summary: "Specific RBI regulations (PA-PG, PSS Act) should be enumerated.",
    reasoning: "Generic compliance language creates ambiguity. Specific regulations should be referenced.",
  },
  ...Array.from({ length: 23 }, (_, i) => {
    const titles = [
      "Definitions",
      "Partnership Scope",
      "Roles and Responsibilities",
      "Joint Marketing",
      "Branding",
      "IP Licence",
      "Service Levels",
      "Reporting",
      "Audit",
      "Confidentiality",
      "Data Protection",
      "Termination",
      "Force Majeure",
      "Limitation of Liability",
      "Governing Law",
      "Arbitration",
      "Notices",
      "Severability",
      "Waiver",
      "Assignment",
      "Counterparts",
      "Entire Agreement",
      "Survival",
    ];
    return {
      num: `${i + 12}.0`,
      title: titles[i],
      riskLevel: i < 5 ? "low" : ("standard" as const),
    } as ClauseSeed;
  }),
]);

// ctr_004: Employment Agreement — pending status, no clauses analyzed yet
// (riskSummary all zeros, reviewedClauses: 0). Leave clauses undefined or empty.
export const employmentClauses: ClauseAnalysis[] = [];
