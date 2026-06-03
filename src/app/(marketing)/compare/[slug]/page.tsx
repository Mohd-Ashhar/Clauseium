import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import {
  extractHeadings,
  getContentByCategory,
  getContentBySlug,
} from "@/lib/content";
import { generateArticleMetadata } from "@/lib/seo";
import { generateAllSchemas } from "@/lib/schema";
import {
  generateProductSchema,
  generateBreadcrumbSchemaForPath,
} from "@/lib/schema-marketing";
import { SITE } from "@/lib/seo";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { mdxComponents } from "@/components/resources/mdx-components";
import { StructuredData } from "@/components/resources/structured-data";
import { TableOfContents } from "@/components/resources/table-of-contents";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const items = await getContentByCategory("comparisons");
  return items.map((item) => ({ slug: item.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getContentBySlug("comparisons", slug);
  if (!item) return {};
  // Override canonical to the /compare/* path (not /resources/comparisons/*).
  const meta = generateArticleMetadata(item);
  return {
    ...meta,
    alternates: { canonical: `${SITE}/compare/${slug}` },
    openGraph: {
      ...meta.openGraph,
      url: `${SITE}/compare/${slug}`,
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getContentBySlug("comparisons", slug);
  if (!item) notFound();

  const headings = extractHeadings(item.body);
  const competitor =
    item.frontmatter.comparison?.competitor.name ?? "alternatives";

  const baseSchemas = generateAllSchemas(item);
  const schemas = [
    ...baseSchemas,
    generateProductSchema(),
    generateBreadcrumbSchemaForPath([
      { name: "Home", url: SITE },
      { name: "Compare", url: `${SITE}/compare` },
      { name: `Clauseium vs ${competitor}`, url: `${SITE}/compare/${slug}` },
    ]),
  ];

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
            { behavior: "wrap", properties: { className: ["heading-anchor"] } },
          ],
        ],
      },
    },
  });

  return (
    <>
      <StructuredData schemas={schemas} />

      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.30), rgba(201,164,73,0.05) 60%, rgba(201,164,73,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              { label: "Compare", href: "/compare" },
              { label: `vs ${competitor}` },
            ]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              Comparison
            </span>
            <h1 className="mt-5 font-display text-[36px] font-bold leading-[1.12] tracking-tight text-white md:text-[46px]">
              {item.frontmatter.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-300 md:text-[17.5px]">
              {item.frontmatter.description}
            </p>
          </div>
        </div>
      </header>

      <div className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              {item.frontmatter.comparison && (
                <ComparisonTable
                  rows={item.frontmatter.comparison.featureMatrix}
                  competitorName={
                    item.frontmatter.comparison.competitor.name
                  }
                />
              )}

              <div className="max-w-[68ch]">{content}</div>

              {item.frontmatter.faq.length > 0 && (
                <FaqSection faq={item.frontmatter.faq} />
              )}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="space-y-6">
                <TableOfContents headings={headings} />
                <div className="rounded-xl border border-counsel-200 bg-counsel-50 p-5">
                  <div className="text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                    Try Clauseium
                  </div>
                  <h4 className="mt-2 font-display text-[16px] font-semibold leading-snug text-paper-900">
                    14-day free trial. First 5 contracts free.
                  </h4>
                  <Button
                    asChild
                    variant="primary"
                    size="md"
                    className="mt-4 w-full"
                  >
                    <Link href="/signup">
                      Start free trial
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden bg-ink-950 py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, rgba(201,164,73,0.18), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-[28px] font-bold leading-tight text-white md:text-[34px]">
            See why Indian counsel choose Clauseium.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-300">
            Built for Indian law. Priced for Indian teams. Trusted by
            Razorpay, Zerodha, Swiggy, CRED, PhonePe, and Meesho.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href="/signup">
                Start free trial
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function FaqSection({
  faq,
}: {
  faq: { question: string; answer: string }[];
}) {
  return (
    <section className="mt-16" id="faq">
      <h2 className="font-display text-[24px] font-semibold tracking-tight text-paper-900">
        Frequently asked questions
      </h2>
      <dl className="mt-6 divide-y divide-paper-200 rounded-2xl border border-paper-200 bg-white">
        {faq.map((item, i) => (
          <div key={i} className="px-6 py-5">
            <dt className="font-display text-[16px] font-semibold text-paper-900">
              {item.question}
            </dt>
            <dd className="mt-2 text-[14.5px] leading-relaxed text-paper-700">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
