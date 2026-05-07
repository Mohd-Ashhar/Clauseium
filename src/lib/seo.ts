import type { Metadata } from "next";
import type { ContentItem } from "@/lib/content";

const SITE_URL = "https://clauseium.com";

export function generateArticleMetadata(item: ContentItem): Metadata {
  const { frontmatter } = item;
  const canonical = `${SITE_URL}/resources/${frontmatter.category}/${frontmatter.slug}`;
  // Note: do NOT set openGraph.images / twitter.images explicitly here.
  // Next.js auto-attaches the co-located opengraph-image.tsx route at the
  // correct hashed URL when these are omitted.
  return {
    title: frontmatter.title,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    authors: [{ name: frontmatter.author.name }],
    alternates: { canonical },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url: canonical,
      siteName: "Clauseium",
      type: "article",
      locale: "en_IN",
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt ?? frontmatter.publishedAt,
      authors: [frontmatter.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export const SITE = SITE_URL;
