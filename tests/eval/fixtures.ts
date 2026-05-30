import type { GoldFixture } from "./types";

// Gold fixtures targeting the ACTUAL rule IDs in src/lib/risk/rules/*. Grouped:
//   (A) per-rule positive cases — the named rule MUST fire (recall),
//   (B) clean clauses — no high/medium finding may fire (precision),
//   (C) whole-contract documents — playbook missing-clause detection.
// Extend freely; the harness scales to any number of fixtures.

export const FIXTURES: GoldFixture[] = [
  // ===========================================================================
  // (A) Per-rule positive cases
  // ===========================================================================

  // ---- Limitation of liability ----
  {
    id: "lol-uncapped",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "The Service Provider shall be liable for all damages, losses and costs arising under or in connection with this Agreement.",
        mustFire: ["lol.uncapped"],
      },
    ],
  },
  {
    id: "lol-cap-too-low",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "The Supplier's total liability under this Agreement shall be limited to one rupee.",
        mustFire: ["lol.cap_too_low"],
      },
    ],
  },
  {
    id: "lol-no-carveouts",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "The aggregate liability of each party under this Agreement shall not exceed the total fees paid in the preceding twelve months, and in no event shall either party be liable for any indirect or consequential damages.",
        mustFire: ["lol.no_carveouts"],
      },
    ],
  },

  // ---- Indemnification ----
  {
    id: "indem-one-sided",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "indemnification",
        text: "The Customer shall indemnify the Supplier against any and all third-party claims arising in connection with this Agreement.",
        mustFire: ["indem.one_sided"],
      },
    ],
  },
  {
    id: "indem-uncapped",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "indemnification",
        text: "Each party shall indemnify and hold harmless the other party against third-party claims, including any claim that the deliverables infringe a third party's intellectual property rights.",
        mustFire: ["indem.uncapped"],
      },
    ],
  },

  // ---- Termination ----
  {
    id: "termination-no-notice",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "termination",
        text: "Either party may terminate this Agreement in the event of a material breach by the other party.",
        mustFire: ["term.no_notice"],
      },
    ],
  },
  {
    id: "termination-no-for-cause",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "termination",
        text: "The Service Provider may terminate this Agreement at any time for convenience upon thirty (30) days' prior written notice to the Customer.",
        mustFire: ["term.no_for_cause"],
      },
    ],
  },

  // ---- Governing law ----
  {
    id: "governing-law-foreign",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "governing_law",
        text: "This Agreement shall be governed by and construed in accordance with the laws of Singapore.",
        mustFire: ["gl.non_indian"],
      },
    ],
  },

  // ---- Jurisdiction ----
  {
    id: "jurisdiction-foreign-no-arbitration",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "The parties irrevocably submit to the exclusive jurisdiction of the courts of London in respect of any dispute arising out of this Agreement.",
        mustFire: ["juris.foreign_no_arbitration"],
      },
    ],
  },
  {
    id: "jurisdiction-non-exclusive",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "The courts at Mumbai shall have non-exclusive jurisdiction in respect of any dispute arising out of or in connection with this Agreement.",
        mustFire: ["juris.non_exclusive"],
      },
    ],
  },

  // ---- Data protection / DPDP ----
  {
    id: "dpdp-no-breach-notice",
    title: "Data Processing Addendum",
    // A DPA is not one of the named archetypes; the detector correctly returns
    // the generic playbook.
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "The Processor shall process the personal data of the Controller's customers only in accordance with the Controller's documented instructions as a data processor.",
        mustFire: ["dpdp.no_breach_notice"],
      },
    ],
  },
  {
    id: "dpdp-cross-border",
    title: "Data Processing Addendum",
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "Acting as a data processor for the specified purpose, the Processor shall notify the Controller of any personal data breach within 72 hours, shall honour the data principal rights of access and correction, and may transfer personal data outside India to its group affiliates for hosting.",
        mustFire: ["dpdp.cross_border_no_safeguard"],
      },
    ],
  },

  // ---- Payment terms ----
  {
    id: "payment-no-due-date",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay the fees by electronic transfer to the Supplier's nominated bank account.",
        mustFire: ["pay.no_due_date"],
      },
    ],
  },
  {
    id: "payment-msmed-violation",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay each MSME supplier within ninety (90) days of acceptance of the relevant invoice.",
        mustFire: ["pay.msmed_violation"],
      },
    ],
  },
  {
    id: "payment-foreign-currency",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay the fees in USD within thirty days of the date of each invoice.",
        mustFire: ["pay.foreign_currency_no_fema"],
      },
    ],
  },

  // ---- IP assignment ----
  {
    id: "ip-no-work-for-hire",
    title: "Consulting Agreement",
    contractType: "consulting",
    clauses: [
      {
        category: "ip_assignment",
        text: "The Consultant assigns to the Customer all intellectual property rights in the deliverables created under this Agreement.",
        mustFire: ["ip.no_work_for_hire"],
      },
    ],
  },

  // ===========================================================================
  // (B) Clean clauses — no high/medium finding may fire (precision)
  // ===========================================================================
  {
    id: "clean-lol-full",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "Notwithstanding the foregoing, the cap shall not apply to fraud, gross negligence or wilful misconduct. The aggregate liability of each party under this Agreement shall not exceed the fees paid in the preceding twelve months, and in no event shall either party be liable for any indirect, consequential or special damages.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-indemnity-mutual-capped",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "indemnification",
        text: "Each party shall indemnify the other against third-party claims, including intellectual property infringement claims, subject to the limitation of liability set out in this Agreement.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-governing-law-india",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "governing_law",
        text: "This Agreement shall be governed by and construed in accordance with the laws of India.",
        mustFire: ["gl.indian"],
        clean: true,
      },
    ],
  },
  {
    id: "clean-jurisdiction-indian-exclusive",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "The courts at Mumbai shall have exclusive jurisdiction over any dispute arising out of or in connection with this Agreement.",
        mustFire: ["juris.indian_exclusive"],
        clean: true,
      },
    ],
  },
  {
    id: "clean-ip-assigned-waived",
    title: "Consulting Agreement",
    contractType: "consulting",
    clauses: [
      {
        category: "ip_assignment",
        text: "All deliverables created by the Consultant during the term of this Agreement shall be works made for hire, and the Consultant assigns all intellectual property rights therein to the Customer; the Consultant's moral rights in the deliverables are hereby waived to the maximum extent permitted by law.",
        mustFire: [],
        clean: true,
      },
    ],
  },

  // ===========================================================================
  // (C) Whole-contract documents — playbook missing-clause detection
  // ===========================================================================
  {
    id: "doc-bare-msa",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "other",
        text: "The Service Provider shall provide the services described in each Statement of Work agreed between the parties from time to time.",
        mustFire: [],
      },
      {
        category: "payment_terms",
        text: "The Customer shall pay all undisputed invoices within thirty days of the invoice date.",
        mustFire: ["pay.no_late_fee"],
      },
      {
        category: "termination",
        text: "Either party may terminate this Agreement on thirty days' prior written notice to the other party.",
        mustFire: [],
      },
      {
        category: "governing_law",
        text: "This Agreement shall be governed by the laws of India and the courts at New Delhi shall have exclusive jurisdiction.",
        mustFire: [],
      },
    ],
    // No liability cap, indemnity or confidentiality anywhere in the document.
    expectedMissing: ["limitation_of_liability", "indemnification", "confidentiality"],
    expectedPresent: ["payment_terms", "governing_law", "termination", "dispute_resolution"],
  },
  {
    id: "doc-saas-missing-dpdp",
    title: "SaaS Subscription Agreement",
    contractType: "saas",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "Notwithstanding the foregoing, the cap shall not apply to fraud or wilful misconduct. The aggregate liability of either party shall not exceed the fees paid in the prior twelve months, and neither party shall be liable for indirect or consequential damages.",
        mustFire: [],
      },
      {
        category: "indemnification",
        text: "Each party shall indemnify and hold harmless the other against third-party claims, including intellectual property infringement, subject to the limitation of liability herein.",
        mustFire: [],
      },
      {
        category: "other",
        text: "Each party shall keep confidential all confidential information of the other party and shall not disclose it to any third party.",
        mustFire: [],
      },
      {
        category: "termination",
        text: "Either party may terminate this Agreement on sixty days' written notice if the other commits a material breach not cured within thirty days, and the confidentiality provisions shall survive termination.",
        mustFire: [],
      },
      {
        category: "payment_terms",
        text: "The Customer shall pay the subscription fees within thirty days, and interest shall accrue on any overdue amount.",
        mustFire: [],
      },
      {
        category: "governing_law",
        text: "This Agreement shall be governed by the laws of India.",
        mustFire: [],
      },
      {
        category: "jurisdiction",
        text: "Disputes shall be referred to arbitration seated in Mumbai under the Arbitration and Conciliation Act 1996.",
        mustFire: [],
      },
    ],
    // Handles customer data but never addresses personal data / DPDP.
    expectedMissing: ["data_protection_dpdp"],
    expectedPresent: [
      "limitation_of_liability",
      "indemnification",
      "confidentiality",
      "termination",
      "payment_terms",
      "governing_law",
      "dispute_resolution",
    ],
  },
  {
    id: "doc-nda-missing-ip-and-dispute",
    title: "Non-Disclosure Agreement",
    contractType: "nda",
    clauses: [
      {
        category: "other",
        text: "The Receiving Party shall keep confidential all proprietary information disclosed by the Disclosing Party and shall use it solely to evaluate the proposed transaction.",
        mustFire: [],
      },
      {
        category: "termination",
        text: "This Agreement shall continue for a period of two years, after which the confidentiality obligations shall terminate.",
        mustFire: [],
      },
      {
        category: "governing_law",
        text: "This Agreement shall be governed by the laws of India.",
        mustFire: [],
      },
    ],
    // No IP ownership of disclosed materials and no dispute-resolution clause.
    expectedMissing: ["ip_assignment", "dispute_resolution"],
    expectedPresent: ["confidentiality", "governing_law"],
  },
];
