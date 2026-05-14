import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { extractHeadings } from "@/lib/content";
import { getPillarBySlug } from "@/lib/pillars";
import {
  generateHowToSchema,
  generatePillarArticleSchema,
  generatePillarBreadcrumbSchema,
  generatePillarFaqSchema,
} from "@/lib/schema";
import { SITE } from "@/lib/seo";
import { mdxComponents } from "@/components/resources/mdx-components";
import { PillarLayout } from "@/components/resources/pillar-layout";
import { StructuredData } from "@/components/resources/structured-data";

export async function buildPillarMetadata(slug: string): Promise<Metadata> {
  const pillar = await getPillarBySlug(slug);
  if (!pillar) return {};
  const url = `${SITE}/${slug}`;
  return {
    title: pillar.frontmatter.title,
    description: pillar.frontmatter.description,
    keywords: pillar.frontmatter.targetKeywords,
    alternates: { canonical: url },
    openGraph: {
      title: pillar.frontmatter.title,
      description: pillar.frontmatter.description,
      url,
      siteName: "Clauseium",
      type: "article",
      locale: "en_IN",
      publishedTime: pillar.frontmatter.publishedAt,
      modifiedTime:
        pillar.frontmatter.updatedAt ?? pillar.frontmatter.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: pillar.frontmatter.title,
      description: pillar.frontmatter.description,
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

export async function renderPillarPage(slug: string) {
  const pillar = await getPillarBySlug(slug);
  if (!pillar) notFound();

  const headings = extractHeadings(pillar.body);

  const schemas: object[] = [
    generatePillarArticleSchema({
      slug: pillar.frontmatter.slug,
      title: pillar.frontmatter.title,
      description: pillar.frontmatter.description,
      publishedAt: pillar.frontmatter.publishedAt,
      updatedAt: pillar.frontmatter.updatedAt,
      keywords: pillar.frontmatter.targetKeywords,
    }),
    generatePillarBreadcrumbSchema(
      pillar.frontmatter.slug,
      pillar.frontmatter.title,
    ),
  ];

  const faqSchema = generatePillarFaqSchema(pillar.frontmatter.faq);
  if (faqSchema) schemas.push(faqSchema);

  if (pillar.frontmatter.howTo) {
    schemas.push(generateHowToSchema(pillar.frontmatter.howTo));
  }

  const { content } = await compileMDX({
    source: pillar.body,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: "wrap", properties: { className: ["heading-anchor"] } },
          ],
        ],
      },
    },
  });

  return (
    <>
      <StructuredData schemas={schemas} />
      <PillarLayout item={pillar} headings={headings}>
        {content}
      </PillarLayout>
    </>
  );
}
