import type { MetadataRoute } from "next";
import {
  CATEGORIES,
  getAllContent,
  getCategoriesInUse,
  getContentByCategory,
} from "@/lib/content";
import { FEATURE_PAGES } from "@/lib/features";

const SITE_URL = "https://clauseium.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const all = await getAllContent();
  const liveCategories = await getCategoriesInUse();
  const comparisons = await getContentByCategory("comparisons");

  // Resource articles. Exclude `comparisons` — those have a canonical at /compare/*
  // and we don't want duplicate URLs.
  const articleUrls: MetadataRoute.Sitemap = all
    .filter((item) => item.frontmatter.category !== "comparisons")
    .map((item) => {
      const lm = item.frontmatter.updatedAt ?? item.frontmatter.publishedAt;
      return {
        url: `${SITE_URL}/resources/${item.frontmatter.category}/${item.frontmatter.slug}`,
        lastModified: new Date(lm),
        changeFrequency: "weekly",
        priority: item.frontmatter.category === "templates" ? 0.9 : 0.8,
      };
    });

  // Resource category listing pages — exclude comparisons (canonical at /compare).
  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.filter(
    (c) => c !== "comparisons",
  ).map((category) => ({
    url: `${SITE_URL}/resources/${category}`,
    lastModified,
    changeFrequency: "weekly",
    priority: liveCategories.includes(category) ? 0.7 : 0.4,
  }));

  // Comparison pages at /compare/[slug] (canonical) — not /resources/comparisons/*
  const compareUrls: MetadataRoute.Sitemap = comparisons.map((item) => {
    const lm = item.frontmatter.updatedAt ?? item.frontmatter.publishedAt;
    return {
      url: `${SITE_URL}/compare/${item.frontmatter.slug}`,
      lastModified: new Date(lm),
      changeFrequency: "weekly",
      priority: 0.9,
    };
  });

  // Feature pages
  const featureUrls: MetadataRoute.Sitemap = FEATURE_PAGES.map((f) => ({
    url: `${SITE_URL}/features/${f.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.95,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/features`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/compare`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/resources`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...featureUrls,
    ...compareUrls,
    ...categoryUrls,
    ...articleUrls,
  ];
}
