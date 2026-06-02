import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type ContentItem, type Heading } from "@/lib/content";
import { AuthorCard, AuthorMetaInline } from "@/components/resources/author-card";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { NewsletterSignup } from "@/components/resources/newsletter-signup";
import { RelatedArticles } from "@/components/resources/related-articles";
import { TableOfContents } from "@/components/resources/table-of-contents";

export function ArticleLayout({
  item,
  headings,
  children,
}: {
  item: ContentItem;
  headings: Heading[];
  children: React.ReactNode;
}) {
  const { frontmatter, readingMinutes } = item;
  const trail = [
    { label: "Home", href: "/" },
    { label: "Resources", href: "/resources" },
    {
      label: CATEGORY_LABELS[frontmatter.category],
      href: `/resources/${frontmatter.category}`,
    },
    { label: frontmatter.title },
  ];

  return (
    <article>
      {/* Dark header */}
      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.35), rgba(201,164,73,0.06) 60%, rgba(201,164,73,0) 80%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 h-[440px] w-[440px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.20), rgba(201,164,73,0.04) 60%, rgba(201,164,73,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <Breadcrumbs trail={trail} variant="dark" />

          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              {CATEGORY_LABELS[frontmatter.category]}
            </span>
            <h1 className="mt-5 font-display text-[34px] font-bold leading-[1.12] tracking-tight text-white md:text-[44px]">
              {frontmatter.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-300 md:text-[17.5px]">
              {frontmatter.description}
            </p>
            <div className="mt-7">
              <AuthorMetaInline
                author={frontmatter.author}
                publishedAt={frontmatter.publishedAt}
                updatedAt={frontmatter.updatedAt}
                readingMinutes={readingMinutes}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Light content */}
      <div className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="max-w-[68ch]">{children}</div>

              {frontmatter.faq.length > 0 && (
                <FaqSection faq={frontmatter.faq} />
              )}

              <AuthorCard
                author={frontmatter.author}
                publishedAt={frontmatter.publishedAt}
                updatedAt={frontmatter.updatedAt}
                variant="full"
              />

              <RelatedArticles
                slugs={[
                  ...frontmatter.relatedArticles,
                  ...frontmatter.relatedTemplates,
                ]}
                currentSlug={frontmatter.slug}
              />
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="space-y-6">
                <TableOfContents headings={headings} />
                <AuthorCard
                  author={frontmatter.author}
                  publishedAt={frontmatter.publishedAt}
                  updatedAt={frontmatter.updatedAt}
                  variant="compact"
                />
                <NewsletterSignup contentSlug={frontmatter.slug} />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Dark CTA */}
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
            Stop reviewing contracts line by line.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-300">
            Clauseium reviews, redlines, and explains every clause under Indian
            law — with citations you can verify. Free for your first 5
            contracts.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href="/signup">
                Start free trial
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/resources">Browse all resources</Link>
            </Button>
          </div>
        </div>
      </section>
    </article>
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
