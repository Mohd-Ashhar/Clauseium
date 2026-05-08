import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import {
  CATEGORY_LABELS,
  type Category,
  getContentBySlug,
} from "@/lib/content";
import { FEATURE_PAGES, getFeatureBySlug } from "@/lib/features";
import {
  generateBreadcrumbSchemaForPath,
  generateHomepageFAQSchema,
  generateSoftwareApplicationSchema,
} from "@/lib/schema-marketing";
import { SITE } from "@/lib/seo";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { StructuredData } from "@/components/resources/structured-data";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURE_PAGES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return {};
  const url = `${SITE}/features/${slug}`;
  return {
    title: feature.ogTitle,
    description: feature.ogDescription,
    alternates: { canonical: url },
    openGraph: {
      title: feature.ogTitle,
      description: feature.ogDescription,
      url,
      siteName: "Clauseium",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: feature.ogTitle,
      description: feature.ogDescription,
    },
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  const schemas = [
    generateSoftwareApplicationSchema(),
    generateHomepageFAQSchema(feature.faq),
    generateBreadcrumbSchemaForPath([
      { name: "Home", url: SITE },
      { name: "Features", url: `${SITE}/features` },
      { name: feature.title, url: `${SITE}/features/${slug}` },
    ]),
  ].filter(Boolean) as object[];

  // Resolve related articles
  const related = await Promise.all(
    feature.relatedArticles.map((r) =>
      getContentBySlug(r.category as Category, r.slug),
    ),
  );
  const validRelated = related.filter((r): r is NonNullable<typeof r> => !!r);
  const relatedFeatures = feature.relatedFeatures
    .map((s) => getFeatureBySlug(s))
    .filter((f): f is NonNullable<typeof f> => !!f);

  return (
    <>
      <StructuredData schemas={schemas} />

      {/* Hero (dark) */}
      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(124,92,255,0.35), rgba(124,92,255,0.06) 60%, rgba(124,92,255,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              { label: "Features", href: "/features" },
              { label: feature.hero.eyebrow },
            ]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              {feature.hero.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight text-white md:text-[52px]">
              {feature.hero.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-ink-300 md:text-[18px]">
              {feature.hero.subheadline}
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <Button asChild variant="primary" size="lg">
                <Link href="/signup">
                  {feature.hero.cta.primary}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              {feature.hero.cta.secondary && (
                <Button asChild variant="ghost" size="lg">
                  <Link href="#cta">{feature.hero.cta.secondary}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Intro (light) */}
      <section className="bg-paper-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-[18px] leading-[1.7] text-paper-900/85">
            {feature.intro}
          </p>
        </div>
      </section>

      {/* Benefits — bento */}
      <section className="bg-paper-50 pb-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <h2 className="font-display text-[26px] font-bold tracking-tight text-paper-900 md:text-[32px]">
            What it does for you.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {feature.benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-paper-200 bg-white p-7"
              >
                <h3 className="font-display text-[18px] font-semibold text-paper-900">
                  {b.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-paper-700">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-paper-50 pb-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <h2 className="font-display text-[26px] font-bold tracking-tight text-paper-900 md:text-[32px]">
            How it works.
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {feature.workflow.map((w, i) => (
              <li
                key={w.step}
                className="rounded-2xl border border-paper-200 bg-white p-5"
              >
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-brand-600">
                  Step {i + 1}
                </div>
                <h3 className="mt-2 font-display text-[16px] font-semibold text-paper-900">
                  {w.step}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-paper-600">
                  {w.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Highlights + Technical spec (dark) */}
      <section className="bg-ink-950 py-20 text-ink-100">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-[26px] font-bold tracking-tight text-white md:text-[32px]">
                Indian-law coverage.
              </h2>
              <ul className="mt-6 space-y-3">
                {feature.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3 text-[14.5px] leading-relaxed text-ink-300">
                    <span className="mt-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-[26px] font-bold tracking-tight text-white md:text-[32px]">
                Technical spec.
              </h2>
              <dl className="mt-6 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-900">
                {feature.technicalSpec.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <dt className="text-[13.5px] text-ink-300">{s.label}</dt>
                    <dd className="text-right font-mono text-[12.5px] text-ink-100">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Related articles + features (light) */}
      {(validRelated.length > 0 || relatedFeatures.length > 0) && (
        <section className="bg-paper-50 py-16">
          <div className="mx-auto max-w-[1240px] px-6">
            {validRelated.length > 0 && (
              <>
                <h2 className="font-display text-[22px] font-bold tracking-tight text-paper-900">
                  Related guides.
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {validRelated.map((item) => (
                    <Link
                      key={item.frontmatter.slug}
                      href={`/resources/${item.frontmatter.category}/${item.frontmatter.slug}`}
                      className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                    >
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                        {CATEGORY_LABELS[item.frontmatter.category]}
                      </span>
                      <h3 className="mt-3 font-display text-[16px] font-semibold leading-snug text-paper-900">
                        {item.frontmatter.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-paper-600">
                        {item.frontmatter.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {relatedFeatures.length > 0 && (
              <div className="mt-12">
                <h2 className="font-display text-[22px] font-bold tracking-tight text-paper-900">
                  Related capabilities.
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedFeatures.map((f) => (
                    <Link
                      key={f.slug}
                      href={`/features/${f.slug}`}
                      className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                    >
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-brand-600">
                        Feature
                      </span>
                      <h3 className="mt-3 font-display text-[16px] font-semibold leading-snug text-paper-900">
                        {f.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-paper-600">
                        {f.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-paper-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-brand-600">
            FAQ
          </p>
          <h2 className="mt-3 text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            {feature.title} — questions, answered.
          </h2>
          <dl className="mt-10 divide-y divide-paper-200 rounded-2xl border border-paper-200 bg-white">
            {feature.faq.map((item) => (
              <div key={item.q} className="px-6 py-5">
                <dt className="font-display text-[16px] font-semibold text-paper-900">
                  {item.q}
                </dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-paper-700">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section
        id="cta"
        className="relative overflow-hidden bg-ink-950 py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, rgba(124,92,255,0.18), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-[28px] font-bold leading-tight text-white md:text-[34px]">
            Ready to try it on your own contracts?
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
    </>
  );
}
