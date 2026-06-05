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

  // ===========================================================================
  // (A2) Additional per-rule positives — broaden rule coverage
  // ===========================================================================

  // ---- Limitation of liability ----
  {
    id: "lol-no-consequential",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "The aggregate liability of the Supplier under this Agreement shall not exceed the total fees paid in the twelve months preceding the claim.",
        mustFire: ["lol.no_consequential_exclusion"],
      },
    ],
  },
  {
    id: "lol-unlimited-variant",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "The Service Provider shall remain liable without limit for any and all loss, cost or damage suffered by the Customer in connection with this Agreement.",
        mustFire: ["lol.uncapped"],
      },
    ],
  },

  // ---- Indemnification ----
  {
    id: "indem-no-ip-coverage",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "indemnification",
        text: "Each party shall indemnify the other against third-party claims arising in connection with this Agreement, subject to the limitation of liability set out herein.",
        mustFire: ["indem.no_ip_infringement"],
      },
    ],
  },
  {
    id: "indem-no-third-party-trigger",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "indemnification",
        text: "Each party shall indemnify and hold harmless the other party from losses arising out of its own breach of this Agreement, including intellectual property infringement, subject to the limitation of liability.",
        mustFire: ["indem.no_third_party_trigger"],
      },
    ],
  },
  {
    id: "indem-one-sided-variant",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "indemnification",
        text: "The Vendor shall indemnify, defend and hold harmless the Customer from all third-party claims arising out of the provision of the Services.",
        mustFire: ["indem.one_sided"],
      },
    ],
  },

  // ---- Termination ----
  {
    id: "termination-no-cure",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "termination",
        text: "Either party may terminate this Agreement immediately upon a material breach by the other party.",
        mustFire: ["term.no_cure_period"],
      },
    ],
  },
  {
    id: "termination-no-survival",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "termination",
        text: "Either Party may terminate this Agreement for a material breach not cured within thirty (30) days of written notice, or for convenience on sixty (60) days' prior written notice.",
        mustFire: ["term.no_survival"],
      },
    ],
  },
  {
    id: "termination-immediate-variant",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "termination",
        text: "This Agreement may be terminated by either party with immediate effect at its sole discretion.",
        mustFire: ["term.no_notice"],
      },
    ],
  },

  // ---- Payment terms ----
  {
    id: "payment-no-tax-allocation",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay all undisputed invoices within thirty (30) days of receipt; any overdue amount shall accrue interest at one and a half per cent per month.",
        mustFire: ["pay.no_tax_allocation"],
      },
    ],
  },
  {
    id: "payment-foreign-currency-variant",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "All fees shall be invoiced and paid in EUR within forty-five days of the invoice date by wire transfer.",
        mustFire: ["pay.foreign_currency_no_fema"],
      },
    ],
  },

  // ---- Governing law ----
  {
    id: "governing-law-new-york",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "governing_law",
        text: "This Agreement shall be governed by and construed in accordance with the laws of the State of New York.",
        mustFire: ["gl.non_indian"],
      },
    ],
  },

  // ---- Jurisdiction ----
  {
    id: "jurisdiction-singapore-variant",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "The courts of Singapore shall have exclusive jurisdiction over any dispute arising out of or in connection with this Agreement.",
        mustFire: ["juris.foreign_no_arbitration"],
      },
    ],
  },

  // ---- Data protection / DPDP ----
  {
    id: "dpdp-no-principal-rights",
    title: "Data Processing Addendum",
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "Acting as a Data Processor for the specified purpose, the Processor shall notify the Data Fiduciary of any personal data breach within seventy-two (72) hours of becoming aware of it.",
        mustFire: ["dpdp.no_data_principal_rights"],
      },
    ],
  },
  {
    id: "dpdp-no-purpose",
    title: "Data Processing Addendum",
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "The Processor shall notify the Controller of any personal data breach within 72 hours and shall honour the data principal rights of access, correction and grievance redressal.",
        mustFire: ["dpdp.no_purpose_limitation"],
      },
    ],
  },
  {
    id: "dpdp-no-fiduciary-role",
    title: "Data Processing Addendum",
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "Personal data shall be processed only for the specified purpose, with the data principal rights of access, correction and grievance redressal honoured, and any personal data breach notified within 72 hours.",
        mustFire: ["dpdp.no_fiduciary_role"],
      },
    ],
  },
  {
    id: "dpdp-consent-bundling",
    title: "Data Processing Addendum",
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "The Data Principal's acceptance of this Agreement shall constitute bundled consent to all processing of personal data described herein and in any related service terms.",
        mustFire: ["dpdp.consent_bundling"],
      },
    ],
  },

  // ---- IP assignment ----
  {
    id: "ip-no-moral-rights",
    title: "Consulting Agreement",
    contractType: "consulting",
    clauses: [
      {
        category: "ip_assignment",
        text: "All deliverables shall be works made for hire and the Consultant assigns all intellectual property rights therein to the Customer.",
        mustFire: ["ip.no_moral_rights_waiver"],
      },
    ],
  },

  // ===========================================================================
  // (B2) Additional clean clauses — no high/medium finding may fire
  // ===========================================================================
  {
    id: "clean-lol-carveouts-2",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "limitation_of_liability",
        text: "Notwithstanding the foregoing, the cap shall not apply to fraud, gross negligence or wilful misconduct. The aggregate liability of each party shall not exceed the fees paid in the preceding twelve months, and in no event shall either party be liable for any indirect, consequential or punitive damages.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-indemnity-mutual-ip-2",
    title: "Master Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "indemnification",
        text: "Each party shall indemnify, defend and hold harmless the other against third-party claims, including intellectual property infringement claims, subject to the limitation of liability in this Agreement.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-payment-full",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay all undisputed invoices within thirty (30) days of receipt. Fees are exclusive of GST, which shall be charged additionally, and the Customer shall withhold tax at source (TDS) as required under the Income-tax Act 1961. Any overdue amount shall accrue late-payment interest at 1.5% per month.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-termination-full",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "termination",
        text: "Either Party may terminate this Agreement for a material breach that the other Party fails to cure within 30 days of written notice, or for convenience on 60 days' prior written notice. The provisions on confidentiality, indemnification and limitation of liability shall survive termination or expiry.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-dpdp-full",
    title: "Data Processing Addendum",
    contractType: "generic",
    clauses: [
      {
        category: "data_protection_dpdp",
        text: "As Data Processor processing personal data solely for the specified purpose on the documented instructions of the Data Fiduciary, the Processor shall, on becoming aware of any personal data breach, notify the Data Fiduciary without undue delay and in any event within seventy-two (72) hours, shall honour the data principal rights of access, correction, erasure and grievance redressal, and shall not transfer personal data outside India except to a notified country under standard contractual clauses.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-governing-india-2",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "governing_law",
        text: "This Agreement shall be governed by and construed in accordance with the laws of the Republic of India, without regard to its conflict of laws principles.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-jurisdiction-arbitration",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "Any dispute arising out of or in connection with this Agreement shall be finally resolved by arbitration seated in Mumbai under the Arbitration and Conciliation Act 1996, by a sole arbitrator appointed by the parties.",
        mustFire: [],
        clean: true,
      },
    ],
  },
  {
    id: "clean-ip-assigned-waived-2",
    title: "Consulting Agreement",
    contractType: "consulting",
    clauses: [
      {
        category: "ip_assignment",
        text: "All works created by the Consultant under this Agreement, whether existing on the Effective Date or developed hereunder, shall be works made for hire; the Consultant irrevocably assigns all intellectual property rights therein to the Customer, and the Consultant's moral rights in such works are hereby waived to the maximum extent permitted by law. Background IP pre-existing the Effective Date shall remain the property of its owner.",
        mustFire: [],
        clean: true,
      },
    ],
  },

  // ===========================================================================
  // (C2) Additional whole-contract document — playbook missing-clause detection
  // ===========================================================================
  {
    id: "doc-bare-vendor",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay all undisputed invoices within thirty (30) days of receipt of a valid tax invoice.",
        mustFire: ["pay.no_late_fee"],
      },
      {
        category: "termination",
        text: "Either party may terminate this Agreement on thirty (30) days' prior written notice to the other party.",
        mustFire: [],
      },
      {
        category: "governing_law",
        text: "This Agreement shall be governed by the laws of India and the courts at Mumbai shall have exclusive jurisdiction.",
        mustFire: [],
      },
    ],
    // No liability cap, indemnity, confidentiality or stamping anywhere.
    expectedMissing: ["limitation_of_liability", "indemnification", "confidentiality", "stamp_duty"],
    expectedPresent: ["payment_terms", "governing_law", "termination", "dispute_resolution"],
  },

  // ===========================================================================
  // (A3) India-specific rule positives (Phase 1C)
  // ===========================================================================
  {
    id: "jurisdiction-no-arbitration-seat",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "Any dispute arising out of or in connection with this Agreement shall be finally resolved by arbitration under the Arbitration and Conciliation Act 1996 by a sole arbitrator.",
        mustFire: ["juris.no_arbitration_seat"],
      },
    ],
  },
  {
    id: "payment-msmed-interest",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay each registered MSME supplier within forty-five (45) days of acceptance of the relevant invoice.",
        mustFire: ["pay.msmed_interest"],
      },
    ],
  },

  // ---- Clean: India provisions correctly addressed ----
  {
    id: "clean-arbitration-seated",
    title: "Services Agreement",
    contractType: "msa",
    clauses: [
      {
        category: "jurisdiction",
        text: "Any dispute shall be finally resolved by arbitration under the Arbitration and Conciliation Act 1996; the seat of arbitration shall be Mumbai, India, and the courts at Mumbai shall have supervisory jurisdiction.",
        mustFire: [],
        clean: true,
      },
    ],
  },

  // ---- Whole-document: stamping present (no stamp_duty gap) ----
  {
    id: "doc-stamped-vendor",
    title: "Vendor Agreement",
    contractType: "vendor",
    clauses: [
      {
        category: "payment_terms",
        text: "The Customer shall pay all undisputed invoices within thirty (30) days of receipt; any overdue amount shall accrue interest at 1.5% per month.",
        mustFire: [],
      },
      {
        category: "other",
        text: "The stamp duty payable on this Agreement shall be borne by the Customer, and the Agreement shall be duly stamped before execution.",
        mustFire: [],
      },
      {
        category: "governing_law",
        text: "This Agreement shall be governed by the laws of India and the courts at Mumbai shall have exclusive jurisdiction.",
        mustFire: [],
      },
    ],
    expectedPresent: ["stamp_duty", "payment_terms", "governing_law"],
  },
];
