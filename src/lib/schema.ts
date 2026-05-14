import { CATEGORY_LABELS, type ContentItem } from "@/lib/content";
import { SITE } from "@/lib/seo";

const ORG = {
  "@type": "Organization",
  name: "Clauseium",
  url: SITE,
  logo: `${SITE}/icon`,
  sameAs: [
    "https://www.linkedin.com/company/clauseium",
    "https://twitter.com/clauseium",
  ],
};

export function generateOrganizationSchema() {
  return { "@context": "https://schema.org", ...ORG };
}

export function generatePersonSchema(item: ContentItem) {
  const { author } = item.frontmatter;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role || "Advocate",
    ...(author.linkedin ? { url: author.linkedin, sameAs: [author.linkedin] } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.enrollment
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "Bar Council Enrollment",
            value: author.enrollment,
          },
        }
      : {}),
    worksFor: ORG,
  };
}

export function generateArticleSchema(item: ContentItem) {
  const { frontmatter } = item;
  const url = `${SITE}/resources/${frontmatter.category}/${frontmatter.slug}`;
  // The per-article OG image route is served at a build-hashed path that we
  // can't predict server-side. Google's preferred path is the og:image meta
  // tag (correctly hashed by Next), and the JSON-LD `image` is a fallback.
  // We use frontmatter.ogImage if explicitly set, else the site OG.
  const ogImage = frontmatter.ogImage ?? `${SITE}/opengraph-image`;

  return {
    "@context": "https://schema.org",
    "@type": frontmatter.schema.type,
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt ?? frontmatter.publishedAt,
    author: {
      "@type": "Person",
      name: frontmatter.author.name,
      jobTitle: frontmatter.author.role || "Advocate",
      ...(frontmatter.author.linkedin ? { url: frontmatter.author.linkedin } : {}),
    },
    publisher: ORG,
    image: [ogImage],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: frontmatter.keywords.join(", "),
    inLanguage: "en-IN",
  };
}

export function generateFAQSchema(item: ContentItem) {
  if (!item.frontmatter.faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: item.frontmatter.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function generateBreadcrumbSchema(item: ContentItem) {
  const { category, title, slug } = item.frontmatter;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "Resources",
        item: `${SITE}/resources`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: CATEGORY_LABELS[category],
        item: `${SITE}/resources/${category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: title,
        item: `${SITE}/resources/${category}/${slug}`,
      },
    ],
  };
}

export function generateAllSchemas(item: ContentItem) {
  return [
    generateArticleSchema(item),
    generateFAQSchema(item),
    generateBreadcrumbSchema(item),
    generatePersonSchema(item),
  ].filter(Boolean) as object[];
}

// --- AEO / Phase 3 schema generators -----------------------------------

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export function generateHowToSchema(input: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    ...(input.totalTime ? { totalTime: input.totalTime } : {}),
    inLanguage: "en-IN",
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
    })),
  };
}

/**
 * Returns the `speakable` sub-object suitable for inclusion on Article,
 * FAQPage, or pillar schemas. Selectors target the on-page elements that
 * voice assistants and AI Overviews should preferentially extract.
 */
export function generateSpeakableSchema(cssSelectors: string[]) {
  return {
    "@type": "SpeakableSpecification",
    cssSelector: cssSelectors,
  };
}

export interface ClaimReviewItem {
  claim: string;
  statute: string;
  section?: string;
  citedText?: string;
}

export function generateClaimReviewSchema(claims: ClaimReviewItem[]) {
  if (!claims.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: claims.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Claim",
        appearance: c.claim,
        firstAppearance: c.section
          ? `${c.statute} § ${c.section}`
          : c.statute,
        ...(c.citedText ? { description: c.citedText } : {}),
      },
    })),
  };
}

// --- Pillar-page schema generators -------------------------------------

export interface PillarSchemaInput {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  keywords: string[];
}

export function generatePillarArticleSchema(p: PillarSchemaInput) {
  const url = `${SITE}/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.description,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt ?? p.publishedAt,
    publisher: ORG,
    image: [`${SITE}/opengraph-image`],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: p.keywords.join(", "),
    inLanguage: "en-IN",
    speakable: generateSpeakableSchema([
      ".key-takeaways",
      "#faq",
    ]),
  };
}

export function generatePillarFaqSchema(
  faq: { question: string; answer: string }[],
) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function generatePillarBreadcrumbSchema(slug: string, title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `${SITE}/${slug}`,
      },
    ],
  };
}
