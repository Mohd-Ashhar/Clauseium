import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import {
  CATEGORIES,
  type Category,
  extractHeadings,
  getAllContent,
  getContentBySlug,
} from "@/lib/content";
import { generateArticleMetadata } from "@/lib/seo";
import { generateAllSchemas } from "@/lib/schema";
import { ArticleLayout } from "@/components/resources/article-layout";
import { mdxComponents } from "@/components/resources/mdx-components";
import { StructuredData } from "@/components/resources/structured-data";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const all = await getAllContent();
  return all.map((item) => ({
    category: item.frontmatter.category,
    slug: item.frontmatter.slug,
  }));
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  if (!isCategory(category)) return {};
  const item = await getContentBySlug(category, slug);
  if (!item) return {};
  return generateArticleMetadata(item);
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  if (!isCategory(category)) notFound();
  const item = await getContentBySlug(category, slug);
  if (!item) notFound();

  const headings = extractHeadings(item.body);
  const schemas = generateAllSchemas(item);

  const { content } = await compileMDX({
    source: item.body,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "wrap",
              properties: { className: ["heading-anchor"] },
            },
          ],
        ],
      },
    },
  });

  return (
    <>
      <StructuredData schemas={schemas} />
      <ArticleLayout item={item} headings={headings}>
        {content}
      </ArticleLayout>
    </>
  );
}
