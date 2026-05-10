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

  {
    slug: "contract-redlining",
    title: "AI Contract Redlining for Indian Counsel",
    description:
      "Clauseium generates Word track-change redlines for any contract — aligned to your playbook, grounded in Indian law, exportable in seconds. Built for in-house counsel.",
    ogTitle: "AI Contract Redlining Tool — Word Add-in for India | Clauseium",
    ogDescription:
      "Generate Word track-change redlines automatically. Aligned to your playbook. Indian-law grounded. 14-day free trial.",
    hero: {
      eyebrow: "Contract Redlining",
      h1: "AI redlining, in your Word document.",
      subheadline:
        "Clauseium reads a counterparty's contract, applies your playbook, and generates Word track-changes in minutes — not the half-day a senior associate spends doing the same.",
      cta: { primary: "Start free trial", secondary: "See it in Word" },
    },
    intro:
      "Manual redlining is the highest-volume, lowest-leverage task on most Indian in-house desks. Clauseium automates the mechanical part — applying your playbook positions, suggesting market-standard fallbacks, generating clean track-changes — so your team spends time on the judgment calls, not the markup. Every suggested redline is grounded in the Indian Contract Act, DPDP Act, and the clause-language library reviewed by Bar Council-enrolled advocates.",
    benefits: [
      {
        title: "Track-changes in Microsoft Word, natively",
        body: "Redlines apply as Word track-changes in your active document. Accept, reject, or modify as you would for any human-generated edit. No copy-paste between tools, no PDF round-trips.",
      },
      {
        title: "Aligned to your playbook",
        body: "Upload your playbook positions — indemnity caps, liability limits, payment terms, IP language. Clauseium redlines the counterparty's contract to match your standards, with fallback positions when the counterparty pushes back.",
      },
      {
        title: "Indian-law fallback library",
        body: "When your playbook doesn't cover an edge case, Clauseium falls back to a 200+ clause library reviewed by Bar Council-enrolled advocates. Stamp-duty placeholders, MSME compliance, DPDP processor language — all pre-drafted to Indian-market standards.",
      },
      {
        title: "Audit trail per redline",
        body: "Every redline is annotated with the underlying reasoning — which playbook position triggered it, which Indian statute applies, which market norm was used as the benchmark. Defensible to GC review, audit, and counterparty pushback.",
      },
    ],
    workflow: [
      {
        step: "Upload",
        body: "Drag a counterparty's contract into Clauseium or open it in Word with the Clauseium add-in side panel.",
      },
      {
        step: "Map playbook",
        body: "Clauseium identifies clauses, classifies them, and matches them against your playbook positions.",
      },
      {
        step: "Generate redlines",
        body: "Track-changes appear in Word with annotations showing why each edit was made — playbook position, fallback rationale, statute reference.",
      },
      {
        step: "Review and accept",
        body: "Use Word's standard track-change tools to accept, reject, or modify each redline. Clauseium's annotations stay attached for audit.",
      },
      {
        step: "Export",
        body: "Send the redlined document to the counterparty. Export the redline summary as a PDF for internal sign-off or board reporting.",
      },
    ],
    highlights: [
      "Track-changes generated in Microsoft Word natively",
      "200+ clause-language library reviewed by Bar Council advocates",
      "Playbook-driven redlines with explicit fallbacks",
      "Indian Contract Act, DPDP, FEMA, Companies Act coverage",
      "Audit trail per redline with statute reference",
      "Side-by-side comparison with original counterparty paper",
      "Bulk redline generation across deal portfolios",
    ],
    technicalSpec: [
      { label: "Output format", value: "Word track-changes (.docx)" },
      { label: "Audit trail format", value: "PDF + JSON" },
      { label: "Median redline generation time", value: "3 min 12 sec" },
      { label: "Clause language library size", value: "200+ Indian-market clauses" },
      { label: "Playbook customisation depth", value: "Per-clause, per-counterparty, per-deal-type" },
      { label: "Word integration", value: "Native add-in (Microsoft 365)" },
    ],
    faq: [
      {
        q: "How does AI redlining work in Clauseium?",
        a: "Clauseium reads the counterparty's contract clause by clause, classifies each clause (indemnity, LoL, payment, IP, termination, etc.), matches it against your uploaded playbook positions, and generates track-change edits to bring it in line. Where your playbook is silent, Clauseium falls back to the Indian-market standard clause library reviewed by our advisory advocates.",
      },
      {
        q: "Are the redlines actually usable, or do they need significant editing?",
        a: "Our internal benchmarks against a 50-contract test set show 78% of suggested redlines are accepted as-is by the reviewing counsel; another 18% are accepted with minor wording tweaks; only 4% are rejected outright. The acceptance rate is highest on standardised clauses (payment, governing law, dispute resolution) and lowest on bespoke commercial terms.",
      },
      {
        q: "Can I bring my own playbook?",
        a: "Yes — and you should. Upload your firm's playbook positions in any structured format (Word, Excel, JSON) and Clauseium learns your standards. The first redline generation against your playbook takes about 30 minutes of setup; after that, every contract gets redlined to your specifications automatically.",
      },
      {
        q: "Does this work in Microsoft Word for Mac?",
        a: "Yes. The Clauseium Word add-in works on Microsoft 365 for Windows, Mac, and Word on the web. We don't currently support Word for iPad or Android.",
      },
      {
        q: "What if the counterparty rejects the redlines?",
        a: "That's normal contract negotiation. Clauseium suggests fallback positions for every redline — if the counterparty rejects 'indemnity capped at 24 months,' the fallback might be 'capped at 18 months with super-cap exceptions for IP and confidentiality.' This is calibrated to Indian-market negotiation norms and saves you from generating fallbacks from scratch.",
      },
      {
        q: "Can I use Clauseium for bulk redline generation?",
        a: "Yes — Chambers and Enterprise tiers support bulk redline workflows. Upload a batch of vendor contracts; Clauseium generates redlines against your playbook in parallel. Useful for end-of-year vendor-renewal sweeps and post-M&A contract harmonisation.",
      },
    ],
    relatedArticles: [
      { category: "templates", slug: "vendor-agreement-template-india" },
      { category: "templates", slug: "saas-agreement-template-india" },
      { category: "clauses", slug: "indemnification-clause-india" },
    ],
    relatedFeatures: ["contract-review", "playbook-enforcement"],
  },

  {
    slug: "playbook-enforcement",
    title: "Contract Playbook Enforcement Software for Indian Teams",
    description:
      "Clauseium turns your in-house playbook into automated review rules. Every contract gets checked against your standards — indemnity caps, payment terms, IP language, DPDP carve-outs.",
    ogTitle: "Contract Playbook Software — Automated Enforcement | Clauseium",
    ogDescription:
      "Automate playbook enforcement across every contract. Indemnity caps, payment terms, DPDP carve-outs — applied consistently. Built for Indian counsel.",
    hero: {
      eyebrow: "Playbook Enforcement",
      h1: "Your playbook, applied to every contract.",
      subheadline:
        "Upload your in-house standards. Clauseium reviews every incoming contract against them — flagging deviations, suggesting redlines, escalating exceptions to the right person on your team.",
      cta: { primary: "Start free trial", secondary: "See sample playbook" },
    },
    intro:
      "Playbooks fail in two predictable ways. First, they live in a Word document nobody reads. Second, even when read, they get applied inconsistently — junior reviewers miss positions, busy GCs accept terms outside the playbook to close deals. Clauseium turns the playbook into structured review rules that get applied automatically to every contract that crosses your desk. Deviations are flagged, suggested redlines are generated, and exception escalations route to the right person on your team — every time.",
    benefits: [
      {
        title: "Structured rules, not Word documents",
        body: "Convert your playbook from prose ('we generally accept indemnity caps of 12-24 months') into structured rules ('indemnity cap must be ≥ 12 months and ≤ 24 months; if outside this range, escalate to the GC'). Clauseium enforces structured rules automatically.",
      },
      {
        title: "Per-counterparty + per-deal-type variations",
        body: "Different rules for different relationships. Looser positions for strategic customers; tighter positions for low-value vendors. Clauseium handles per-counterparty playbook variations and per-deal-type overlays without rule duplication.",
      },
      {
        title: "Exception escalation routing",
        body: "When a contract deviates from your playbook in a way that requires senior review, Clauseium routes the exception to the assigned reviewer (GC, deputy GC, designated specialist) with a structured summary of the deviation and the reasoning.",
      },
      {
        title: "Playbook drift analytics",
        body: "Clauseium tracks how often each playbook position gets accepted vs deviated from. If your 'indemnity capped at 12 months' position gets pushed to 18 months in 80% of deals, that's a signal to update the playbook itself. Useful for the annual playbook refresh cycle.",
      },
    ],
    workflow: [
      {
        step: "Upload playbook",
        body: "Bring your existing playbook in any format — Word, Excel, JSON, or paste prose. Clauseium structures it into reviewable rules.",
      },
      {
        step: "Configure escalations",
        body: "Map each rule to an escalation owner. Indemnity exceptions to the GC; payment-term exceptions to the deputy GC; DPDP exceptions to the privacy lead.",
      },
      {
        step: "Apply to contracts",
        body: "Every contract uploaded to Clauseium is reviewed against your structured playbook in seconds. Deviations are flagged with severity (High / Medium / Low).",
      },
      {
        step: "Suggested redlines",
        body: "For every flagged deviation, Clauseium suggests playbook-conforming redlines and Indian-market fallback positions.",
      },
      {
        step: "Track and refine",
        body: "Use playbook drift analytics to identify positions that aren't holding up in negotiation. Refresh the playbook quarterly based on actual deal data.",
      },
    ],
    highlights: [
      "Structured rule format — JSON-backed, version-controlled",
      "Per-counterparty playbook variations",
      "Per-deal-type overlays (vendor, customer, employment)",
      "Severity-graded exception flagging",
      "Escalation routing with structured deviation summaries",
      "Playbook drift analytics dashboard",
      "Quarterly playbook refresh suggestions",
    ],
    technicalSpec: [
      { label: "Playbook input formats", value: ".docx, .xlsx, JSON, prose" },
      { label: "Rule types supported", value: "Threshold, range, mandatory, prohibited" },
      { label: "Escalation channels", value: "Email, Slack, Microsoft Teams" },
      { label: "Per-counterparty variations", value: "Unlimited" },
      { label: "Drift analytics retention", value: "24 months" },
      { label: "Version control", value: "Git-style playbook history" },
    ],
    faq: [
      {
        q: "What is contract playbook enforcement software?",
        a: "Software that takes a legal team's contract playbook (the document defining acceptable contract terms) and automates its application across every contract the team reviews. Instead of relying on humans to remember and apply playbook positions consistently, the software flags deviations and suggests playbook-conforming redlines automatically.",
      },
      {
        q: "How is this different from a regular contract review tool?",
        a: "A general contract review tool flags risks against generic best practices. Playbook enforcement applies your firm's specific positions — your indemnity caps, your payment terms, your IP language — which are different from market-standard. Clauseium does both: generic Indian-law risk review plus your specific playbook enforcement.",
      },
      {
        q: "How long does it take to convert our playbook into Clauseium rules?",
        a: "Most teams complete the initial conversion in 2-4 hours. We provide a structured template and AI assistance to extract rules from prose playbooks. The first 80% of rules are easy; the last 20% (edge cases, exception logic) takes more thought.",
      },
      {
        q: "Can different teams use different playbooks?",
        a: "Yes. Chambers and Enterprise tiers support multiple playbooks per organisation — one for the customer-side legal team, one for procurement, one for HR. Each contract is routed to the appropriate playbook based on counterparty type or deal classification.",
      },
      {
        q: "What if our playbook positions are outdated?",
        a: "Clauseium's drift analytics surface this. If a position gets deviated from in 60%+ of deals, the playbook is probably out of step with current market norms. Use the analytics to drive the quarterly refresh cycle. Many of our customers have meaningfully tightened or loosened their playbooks based on these insights.",
      },
      {
        q: "How does playbook enforcement integrate with our existing CLM?",
        a: "Via API. Clauseium pushes playbook-flagged deviations and suggested redlines into your CLM workflow, so the deviation history is preserved alongside the contract. We integrate with major CLMs including SpotDraft, Ironclad, and Juro. See our [comparison page](/compare/clauseium-vs-spotdraft) for the integration framing.",
      },
    ],
    relatedArticles: [
      { category: "templates", slug: "vendor-agreement-template-india" },
      { category: "clauses", slug: "indemnification-clause-india" },
      { category: "templates", slug: "saas-agreement-template-india" },
    ],
    relatedFeatures: ["contract-review", "contract-redlining"],
  },
];

export function getFeatureBySlug(slug: string): FeaturePage | null {
  return FEATURE_PAGES.find((f) => f.slug === slug) ?? null;
}

export function getAllFeatures(): FeaturePage[] {
  return FEATURE_PAGES;
}
