import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Heading } from "@/lib/content";
import type { PillarFrontmatter, PillarItem } from "@/lib/pillars";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { TableOfContents } from "@/components/resources/table-of-contents";

export function PillarLayout({
  item,
  headings,
  children,
}: {
  item: PillarItem;
  headings: Heading[];
  children: React.ReactNode;
}) {
  const { frontmatter, readingMinutes } = item;
  return (
    <article>
      {/* Dark hero */}
      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.35), rgba(201,164,73,0.06) 60%, rgba(201,164,73,0) 80%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 h-[460px] w-[460px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.20), rgba(201,164,73,0.04) 60%, rgba(201,164,73,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              { label: frontmatter.hero.eyebrow },
            ]}
            variant="dark"
          />
          <div className="mt-8 max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              <Sparkles className="h-3 w-3" />
              {frontmatter.hero.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.08] tracking-tight text-white md:text-[56px]">
              {frontmatter.hero.h1}
            </h1>
            <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-ink-300 md:text-[19px]">
              {frontmatter.hero.subheadline}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-400">
              <span>Pillar guide</span>
              <span className="text-ink-500">·</span>
              <span>{readingMinutes} min read</span>
              <span className="text-ink-500">·</span>
              <time dateTime={frontmatter.updatedAt ?? frontmatter.publishedAt}>
                Updated{" "}
                {new Date(
                  frontmatter.updatedAt ?? frontmatter.publishedAt,
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>
        </div>
      </header>

      {/* Light body */}
      <div className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="max-w-[72ch]">{children}</div>

              {frontmatter.faq.length > 0 && (
                <FaqSection faq={frontmatter.faq} />
              )}

              {frontmatter.spokes.length > 0 && (
                <SpokeGrid spokes={frontmatter.spokes} />
              )}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="space-y-6">
                <TableOfContents headings={headings} />
                <PillarSidebarCTA slug={frontmatter.slug} />
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
            Built for Indian counsel. Trusted by India&apos;s leading teams.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-300">
            14-day free trial. First 5 contracts free. No credit card required.
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
    </article>
  );
}

function FaqSection({
  faq,
}: {
  faq: PillarFrontmatter["faq"];
}) {
  return (
    <section className="mt-16" id="faq">
      <h2 className="font-display text-[26px] font-semibold tracking-tight text-paper-900">
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

function SpokeGrid({
  spokes,
}: {
  spokes: PillarFrontmatter["spokes"];
}) {
  return (
    <section className="mt-20">
      <h2 className="font-display text-[26px] font-semibold tracking-tight text-paper-900">
        Deep dives
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-paper-700">
        Continue with the specific guides, templates, and clause deep-dives
        connected to this pillar.
      </p>

      <div className="mt-8 space-y-10">
        {spokes.map((group) => (
          <div key={group.section}>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-counsel-600">
              {group.section}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col rounded-xl border border-paper-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-counsel-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-500">
                      Guide
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-paper-400 transition-colors group-hover:text-counsel-600" />
                  </div>
                  <h4 className="mt-3 font-display text-[15.5px] font-semibold leading-snug text-paper-900">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-paper-600">
                      {item.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PillarSidebarCTA({ slug }: { slug: string }) {
  return (
    <div className="rounded-xl border border-counsel-200 bg-counsel-50 p-5">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
        Try Clauseium
      </div>
      <h4 className="mt-2 font-display text-[15.5px] font-semibold leading-snug text-paper-900">
        Indian-law AI contract review.
      </h4>
      <p className="mt-2 text-[12.5px] leading-relaxed text-paper-600">
        14-day free trial. First 5 contracts free. No credit card.
      </p>
      <Button asChild variant="primary" size="md" className="mt-4 w-full">
        <Link href={`/signup?ref=${slug}`}>
          Start free trial
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
