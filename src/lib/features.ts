export interface FeatureBenefit {
  title: string;
  body: string;
}

export interface FeatureWorkflow {
  step: string;
  body: string;
}

export interface FeatureFAQ {
  q: string;
  a: string;
}

export interface FeaturePage {
  slug: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  hero: {
    eyebrow: string;
    h1: string;
    subheadline: string;
    cta: { primary: string; secondary?: string };
  };
  intro: string;
  benefits: FeatureBenefit[];
  workflow: FeatureWorkflow[];
  highlights: string[];
  technicalSpec: { label: string; value: string }[];
  faq: FeatureFAQ[];
  relatedArticles: { category: string; slug: string }[];
  relatedFeatures: string[];
}

export const FEATURE_PAGES: FeaturePage[] = [
  {
    slug: "contract-review",
    title: "AI Contract Review for Indian Counsel",
    description:
      "Clauseium reviews every clause in your contract under Indian law in 6 minutes — flagging risks, citing the Indian Contract Act, DPDP Act, and your own playbook. Built for in-house counsel.",
    ogTitle: "AI Contract Review — Built for Indian Counsel | Clauseium",
    ogDescription:
      "Review contracts in 6 minutes. Indian Contract Act + DPDP Act grounded. Every citation verified. Used by Razorpay, Zerodha, and Swiggy.",
    hero: {
      eyebrow: "AI Contract Review",
      h1: "AI contract review for Indian counsel.",
      subheadline:
        "Upload a contract. Get a clause-by-clause risk analysis, plain-English summary, suggested redlines, and verified citations — in 6 minutes, not 6 hours.",
      cta: { primary: "Start free trial", secondary: "Book 20-min demo" },
    },
    intro:
      "Clauseium reads contracts the way an experienced Indian in-house counsel would: section by section, flagging where the deal deviates from market practice, where the language fails Indian Contract Act enforceability, where DPDP obligations are missing, and where your own playbook would push back. Every citation is verified against Indian Kanoon and India Code before it appears in your review.",
    benefits: [
      {
        title: "Grounded in Indian law, not US precedents",
        body: "Every analysis cites the Indian Contract Act, 1872, the DPDP Act, 2023, the Companies Act, 2013, FEMA 1999, the IT Act 2000, the Arbitration Act 1996, and the Indian Stamp Act, 1899. We don't hallucinate state-by-state US rules into Indian contracts.",
      },
      {
        title: "Three-stage citation verification",
        body: "Citations are verified at extraction, at retrieval, and at output. If the AI cannot match a referenced section against our live legal corpus, the citation is suppressed before you ever see it. Zero hallucinated citations.",
      },
      {
        title: "Your playbook, enforced automatically",
        body: "Upload your firm's standard positions — indemnity caps, liability limits, payment terms, IP language. Clauseium flags every clause that deviates from your playbook, not just generic best practices.",
      },
      {
        title: "Six minutes, not six hours",
        body: "A 40-page MSA returns clause analysis, risk flags, suggested redlines, and citations in under 6 minutes. The Word add-in lets you accept or modify changes without leaving the document.",
      },
    ],
    workflow: [
      {
        step: "Upload",
        body: "Drag and drop a Word or PDF contract — counterparty paper, your own draft, or a marked-up redline. Up to 100 pages per file.",
      },
      {
        step: "Analyze",
        body: "Clauseium identifies clauses, classifies them by type (indemnity, LoL, IP, termination, payment), and runs each through the Indian-law risk engine.",
      },
      {
        step: "Review",
        body: "See a three-pane interface: document viewer, clause analysis with risk badges (High / Medium / Low), citations panel with the underlying statute or case law.",
      },
      {
        step: "Redline",
        body: "Accept suggested redlines as track changes in Microsoft Word. Or use Clauseium's clause drafter to rewrite a clause to match your playbook.",
      },
      {
        step: "Export",
        body: "Export the redlined Word document, the analysis report (PDF), and the citation list — ready to share with the business team or counterparty.",
      },
    ],
    highlights: [
      "Indian Contract Act, 1872 — every Section, with case-law cross-reference",
      "DPDP Act, 2023 — consent, processor, breach, cross-border checks",
      "Companies Act, 2013 — director liability, related-party transactions",
      "FEMA, 1999 — cross-border payment and ECB compliance",
      "Indian Stamp Act, 1899 — state-by-state stamp duty calculation",
      "Arbitration Act, 1996 — institutional arbitration clauses",
      "Bar Council of India ethics — engagement letter compliance",
    ],
    technicalSpec: [
      { label: "Languages", value: "English, Hindi (Beta)" },
      { label: "Supported file formats", value: ".docx, .pdf" },
      { label: "Max pages per contract", value: "100" },
      { label: "Median review time", value: "5 min 47 sec" },
      { label: "Citation source corpus", value: "16M+ Indian Kanoon judgments + India Code" },
      { label: "Data residency", value: "AWS Mumbai (ap-south-1)" },
      { label: "Encryption", value: "AES-256 at rest, TLS 1.3 in transit" },
      { label: "Compliance", value: "SOC 2 Type II, ISO 27001, ISO 42001, DPDP-ready" },
    ],
    faq: [
      {
        q: "How does AI contract review work in Clauseium?",
        a: "Clauseium uses a retrieval-augmented generation (RAG) pipeline grounded in Indian Kanoon (16M+ judgments), the full India Code, the DPDP Act 2023 and Rules 2025, RBI Master Directions, and SEBI Regulations. Every clause is parsed, classified, run through the Indian-law risk engine, and matched against your playbook. Citations are verified before display.",
      },
      {
        q: "Is AI contract review accurate enough for Indian commercial contracts?",
        a: "Our accuracy benchmarks against a 50-contract test set hand-reviewed by Bar Council-enrolled advocates show 94% precision on risk identification and 98% precision on citation accuracy. Clauseium augments human review; it does not replace counsel for novel transactions or significant deal value.",
      },
      {
        q: "How is this different from ChatGPT or Claude?",
        a: "ChatGPT and Claude are general-purpose models with no grounding in Indian law. They hallucinate Section numbers, cite repealed statutes, and apply US contract concepts to Indian deals. Clauseium is purpose-built: every output is grounded in our Indian legal corpus, and every citation is verified against the live source before display.",
      },
      {
        q: "Does Clauseium replace my outside counsel?",
        a: "No. Clauseium accelerates the routine 80% of contract review — playbook compliance, clause-by-clause risk, citation work — so your team can focus on the bespoke 20% that needs senior judgment. Several of our customers use Clauseium for first-pass review and route flagged contracts to outside counsel.",
      },
      {
        q: "What contract types does Clauseium handle?",
        a: "Vendor agreements, SaaS subscription agreements, MSAs, NDAs, employment contracts, consulting agreements, distribution agreements, license agreements, IP assignment agreements, and most commercial contracts under Indian law. We do not currently handle litigation pleadings, conveyance deeds, or family-law instruments.",
      },
      {
        q: "How does pricing scale with contract volume?",
        a: "Counsel tier (₹2,999/user/month) includes 50 reviews/month. Chambers and Enterprise are unlimited. We don't charge per-contract or per-page fees. See the pricing page for the full breakdown.",
      },
    ],
    relatedArticles: [
      { category: "templates", slug: "nda-template-india" },
      { category: "templates", slug: "vendor-agreement-template-india" },
      { category: "clauses", slug: "indemnification-clause-india" },
    ],
    relatedFeatures: ["dpdp-compliance"],
  },

  {
    slug: "dpdp-compliance",
    title: "DPDP Compliance Scanning for Indian Contracts",
    description:
      "Clauseium scans every contract for Digital Personal Data Protection Act, 2023 compliance gaps — consent, breach notification, processor obligations, cross-border transfers, and data principal rights. Built for Indian counsel.",
    ogTitle: "DPDP Compliance AI — Scan Indian Contracts | Clauseium",
    ogDescription:
      "Automated DPDP Act 2023 compliance scanning for Indian contracts. Section 8(5), Section 11, breach notification, cross-border transfer — all checked.",
    hero: {
      eyebrow: "DPDP Compliance",
      h1: "DPDP Act compliance, scanned automatically.",
      subheadline:
        "Every contract gets a DPDP-readiness score in seconds. Clauseium identifies missing processor obligations, weak consent flows, absent breach windows, and cross-border transfer gaps — citing the exact section of the Act.",
      cta: { primary: "Start free trial", secondary: "Read DPDP guide" },
    },
    intro:
      "The Digital Personal Data Protection Act, 2023 imposes obligations on every Indian company that processes personal data. Section 8(5) requires a written contract with every data processor. Section 11 grants data principal rights. Section 16 governs cross-border transfers. Section 33 sets penalties up to ₹250 crore per breach. Clauseium scans every contract you upload for DPDP compliance and tells you exactly what's missing.",
    benefits: [
      {
        title: "Section 8(5) processor obligations checklist",
        body: "Every processor contract is checked against the eight Section 8(5) obligations: process only on instruction, security measures, sub-processor approval, breach notification, audit rights, return/delete on termination, cross-border transfers, and confidentiality. Missing items are flagged with suggested clause language.",
      },
      {
        title: "Consent flow audit",
        body: "Clauseium reads consent language and tests it against Section 6's five requirements: free, specific, informed, unconditional, unambiguous. Bundled consent, pre-ticked boxes, and ToS-conditioned consent all get flagged.",
      },
      {
        title: "Cross-border transfer compliance",
        body: "Section 16 of the DPDP Act and sectoral RBI directions limit where Indian personal data can be stored. Clauseium identifies cross-border data flows in your contracts and flags missing geographic restrictions or data residency commitments.",
      },
      {
        title: "Breach notification windows",
        body: "DPDP Rule 7 requires fiduciaries to notify the Board within 72 hours. Clauseium checks every processor contract for a notification window of 48 hours or less and flags weaker terms that push DPDP risk back onto the fiduciary.",
      },
    ],
    workflow: [
      {
        step: "Upload contract",
        body: "Drop in any contract that handles personal data — vendor agreement, SaaS subscription, processor agreement, employment contract, customer DPA.",
      },
      {
        step: "DPDP scan",
        body: "Clauseium classifies the parties' roles (fiduciary, processor, joint), maps the data flows, and runs the contract against the Section 8(5) and Section 11 checklists.",
      },
      {
        step: "Compliance score",
        body: "Each contract receives a DPDP-readiness score with a clause-by-clause breakdown: which obligations are present, which are weak, which are missing entirely.",
      },
      {
        step: "Suggested redlines",
        body: "For every missing obligation, Clauseium suggests Indian-law-compliant clause language pre-drafted by Bar Council-enrolled advocates. Accept the redline, modify it, or reject it.",
      },
      {
        step: "Audit trail",
        body: "Export a DPDP compliance report (PDF) for every reviewed contract — for internal sign-off, board reporting, or Data Protection Board inquiry response.",
      },
    ],
    highlights: [
      "Section 5 — privacy notice compliance",
      "Section 6 — consent standard (5-test audit)",
      "Section 7 — legitimate-use grounds beyond consent",
      "Section 8 — security and processor obligations",
      "Section 9 — children's data verification",
      "Section 10 — Significant Data Fiduciary triggers",
      "Section 11-14 — data principal rights workflow",
      "Section 16 — cross-border transfer restrictions",
      "Section 33 — penalty exposure heatmap",
    ],
    technicalSpec: [
      { label: "DPDP Act version tracked", value: "Act + Draft Rules 2025" },
      { label: "Sectoral overlays", value: "RBI, IRDAI, SEBI, MeitY" },
      { label: "Processor checklist items", value: "16" },
      { label: "Suggested clause library", value: "120+ DPDP-aware clauses" },
      { label: "Audit report formats", value: "PDF, JSON, CSV" },
      { label: "Update cadence", value: "Live tracking of DPDP Board notifications" },
    ],
    faq: [
      {
        q: "When does the DPDP Act 2023 come into force?",
        a: "The Act received presidential assent in August 2023. The draft DPDP Rules were published in January 2025. Most operative sections are being notified in tranches through 2026, with an 18-month transition window for compliance once the Data Protection Board is operationalised.",
      },
      {
        q: "What's the difference between a data fiduciary and a data processor?",
        a: "The data fiduciary determines the purpose and means of processing personal data; the processor processes data on the fiduciary's instructions. Most Indian companies are fiduciaries for their customer and employee data, and processors when handling third-party data on a customer's behalf. Clauseium classifies the role automatically.",
      },
      {
        q: "Do I need a DPA with every vendor that handles personal data?",
        a: "Yes. Section 8(5) requires a written contract with every processor obligating them to specific data handling standards. The DPA can be a standalone agreement or a schedule to the master contract. Clauseium identifies vendors that lack a DPA and flags them.",
      },
      {
        q: "What are the penalties under the DPDP Act?",
        a: "Up to ₹250 crore per breach for failure to take reasonable security safeguards (Schedule, Item 1), ₹200 crore for failure to notify a personal data breach to the Board (Item 2), and ₹150 crore for failure to fulfil obligations to children (Item 3). The Data Protection Board imposes these after inquiry under Section 27.",
      },
      {
        q: "How does Clauseium handle the SPDI Rules 2011?",
        a: "The SPDI Rules under the IT Act 43A continue to apply for sensitive personal data and information until the DPDP Rules supersede them. Clauseium runs both checks where applicable — DPDP for personal data generally, SPDI for sensitive categories — until the transition completes.",
      },
    ],
    relatedArticles: [
      { category: "dpdp", slug: "dpdp-compliance-guide" },
      { category: "dpdp", slug: "dpdp-consent-requirements-india" },
      { category: "templates", slug: "saas-agreement-template-india" },
    ],
    relatedFeatures: ["contract-review"],
  },
];

export function getFeatureBySlug(slug: string): FeaturePage | null {
  return FEATURE_PAGES.find((f) => f.slug === slug) ?? null;
}

export function getAllFeatures(): FeaturePage[] {
  return FEATURE_PAGES;
}
