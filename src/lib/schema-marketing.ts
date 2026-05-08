import { SITE } from "@/lib/seo";

const ORG = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: "Clauseium",
  legalName: "Clauseium Technologies Pvt Ltd",
  url: SITE,
  logo: `${SITE}/icon`,
  foundingDate: "2025",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bengaluru",
    addressRegion: "KA",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "hello@clauseium.com",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
  knowsAbout: [
    "Indian Contract Act, 1872",
    "Digital Personal Data Protection Act, 2023",
    "Companies Act, 2013",
    "FEMA, 1999",
    "Arbitration and Conciliation Act, 1996",
    "AI contract review",
    "Legal technology India",
  ],
  sameAs: [
    "https://www.linkedin.com/company/clauseium",
    "https://twitter.com/clauseium",
  ],
};

const PRICING_OFFERS = [
  {
    "@type": "Offer",
    name: "Counsel",
    description: "For solo GCs and small in-house teams.",
    price: "2999",
    priceCurrency: "INR",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "2999",
      priceCurrency: "INR",
      unitText: "user/month",
      billingDuration: "P1Y",
    },
    availability: "https://schema.org/InStock",
    url: `${SITE}/pricing`,
  },
  {
    "@type": "Offer",
    name: "Chambers",
    description: "For in-house teams of 4-25.",
    price: "4999",
    priceCurrency: "INR",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "4999",
      priceCurrency: "INR",
      unitText: "user/month",
      billingDuration: "P1Y",
    },
    availability: "https://schema.org/InStock",
    url: `${SITE}/pricing`,
  },
  {
    "@type": "Offer",
    name: "Enterprise",
    description: "For large corporates and MNCs. Custom pricing.",
    priceSpecification: {
      "@type": "PriceSpecification",
      priceCurrency: "INR",
      eligibleQuantity: { "@type": "QuantitativeValue", minValue: 25 },
    },
    availability: "https://schema.org/InStock",
    url: `${SITE}/pricing`,
  },
];

export function generateMarketingOrganizationSchema() {
  return { "@context": "https://schema.org", ...ORG };
}

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#software`,
    name: "Clauseium",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "LegalSoftware",
    operatingSystem: "Web, Microsoft Word",
    description:
      "AI contract review software for Indian in-house counsel. Reviews, redlines, and drafts contracts under Indian law — grounded in the Indian Contract Act, DPDP Act, and your own playbook. Every clause cited. Every risk flagged.",
    url: SITE,
    softwareVersion: "1.0",
    inLanguage: "en-IN",
    audience: {
      "@type": "BusinessAudience",
      audienceType: "In-house counsel, India",
    },
    featureList: [
      "AI contract review under Indian law",
      "Clause-by-clause risk analysis",
      "Automated redline generation in Microsoft Word",
      "Citation verification against Indian Kanoon and India Code",
      "DPDP Act 2023 compliance scanning",
      "Custom contract playbook enforcement",
      "Clause benchmarking across thousands of agreements",
      "Indian Contract Act, Companies Act, FEMA, IT Act coverage",
    ],
    offers: PRICING_OFFERS,
    publisher: ORG,
  };
}

export function generateProductSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE}/#product`,
    name: "Clauseium",
    description:
      "India's AI contract review platform. Review contracts in 6 minutes, not 6 hours — grounded in the Indian Contract Act, DPDP, and your own playbook.",
    brand: { "@id": `${SITE}/#organization` },
    category: "Legal Technology Software",
    offers: PRICING_OFFERS,
    // aggregateRating intentionally omitted until 10+ verified reviews exist on G2/Capterra.
    // Fabricated rating data triggers Google's structured-data spam policy.
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    name: "Clauseium",
    url: SITE,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/resources?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface FAQItem {
  q: string;
  a: string;
}

export function generateHomepageFAQSchema(items: FAQItem[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function generateBreadcrumbSchemaForPath(
  trail: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

export const HOMEPAGE_FAQS: FAQItem[] = [
  {
    q: "Is my contract data used to train AI models?",
    a: "Never. Clauseium operates under zero data retention agreements with all foundation model providers. Your contracts are processed in-memory, citations are verified, and no data is stored beyond your encrypted workspace. We use AWS Mumbai for data residency under the DPDP Act.",
  },
  {
    q: "How is Clauseium different from ChatGPT or Harvey?",
    a: "ChatGPT has no Indian law training and hallucinates citations in 30%+ of legal queries. Harvey is built for AmLaw 100 firms at $1,200+ per seat. Clauseium is purpose-built for Indian in-house counsel — grounded in the Indian Contract Act, DPDP Act, Companies Act, and FEMA, with a three-stage citation verification pipeline that blocks unverified references before you see them. At 1/10th of Harvey's price.",
  },
  {
    q: "Does it actually know Indian law?",
    a: "Yes. Our RAG system is grounded in Indian Kanoon (16M+ judgments), India Code (all Central Acts), DPDP Act 2023 + Rules 2025, RBI Master Directions, and SEBI Regulations. Every citation is verified against the source before display. Our legal advisory board includes practising advocates enrolled with the Bar Council of India.",
  },
  {
    q: "How does it integrate with Word?",
    a: "Clauseium installs as a Microsoft Word Add-in. Open any contract in Word, click 'Review with Clauseium' in the sidebar, and receive clause-by-clause analysis, risk flags, and suggested redlines — all without leaving your document.",
  },
  {
    q: "What about DPDP Act compliance?",
    a: "Clauseium automatically scans every contract for DPDP compliance gaps — checking for consent mechanisms, data processing agreements, breach notification terms, cross-border transfer clauses, and Data Principal rights provisions as required under the DPDP Rules 2025.",
  },
  {
    q: "Can I bring my own contracting playbook?",
    a: "Absolutely. Upload your firm's standard positions, preferred clause language, and risk thresholds. Clauseium learns your playbook and enforces it during every review — flagging deviations from your standards, not just generic best practices.",
  },
];
