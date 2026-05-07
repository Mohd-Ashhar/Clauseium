import type { MetadataRoute } from "next";
import {
  CATEGORIES,
  getAllContent,
  getCategoriesInUse,
} from "@/lib/content";

const SITE_URL = "https://clauseium.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const all = await getAllContent();
  const liveCategories = await getCategoriesInUse();

  const articleUrls: MetadataRoute.Sitemap = all.map((item) => {
    const lm = item.frontmatter.updatedAt ?? item.frontmatter.publishedAt;
    return {
      url: `${SITE_URL}/resources/${item.frontmatter.category}/${item.frontmatter.slug}`,
      lastModified: new Date(lm),
      changeFrequency: "weekly",
      priority: item.frontmatter.category === "templates" ? 0.9 : 0.8,
    };
  });

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: `${SITE_URL}/resources/${category}`,
    lastModified,
    changeFrequency: "weekly",
    priority: liveCategories.includes(category) ? 0.7 : 0.4,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/resources`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...categoryUrls,
    ...articleUrls,
  ];
}
