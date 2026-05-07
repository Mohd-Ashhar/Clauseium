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
