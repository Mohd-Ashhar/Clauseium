import type { MetadataRoute } from "next";

const SITE_URL = "https://clauseium.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Extend with marketing routes (/pricing, /about, /blog/[slug]) once they ship.
    // Make this function async if entries are sourced dynamically (CMS, MDX dir).
  ];
}
