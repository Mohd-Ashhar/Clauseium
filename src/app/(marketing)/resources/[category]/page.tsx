import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  type Category,
  getContentByCategory,
} from "@/lib/content";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  // Exclude `comparisons` — that listing lives at /compare (canonical).
  return CATEGORIES.filter((c) => c !== "comparisons").map((category) => ({
    category,
  }));
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return {};
  return {
    title: `${CATEGORY_LABELS[category]} for Indian Counsel`,
    description: CATEGORY_DESCRIPTIONS[category],
    alternates: { canonical: `/resources/${category}` },
  };
}

export default async function CategoryListingPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  const items = await getContentByCategory(category);

  return (
    <>
      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[440px] w-[440px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(124,92,255,0.30), rgba(124,92,255,0.05) 60%, rgba(124,92,255,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              { label: "Resources", href: "/resources" },
              { label: CATEGORY_LABELS[category] },
            ]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              {CATEGORY_LABELS[category]}
            </span>
            <h1 className="mt-5 font-display text-[36px] font-bold leading-[1.12] tracking-tight text-white md:text-[44px]">
              {CATEGORY_LABELS[category]}
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-300 md:text-[17px]">
              {CATEGORY_DESCRIPTIONS[category]}
            </p>
          </div>
        </div>
      </header>

      <section className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-300 bg-white p-12 text-center">
              <h2 className="font-display text-[20px] font-semibold text-paper-900">
                Coming soon
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-paper-600">
                We&apos;re publishing the first batch of {CATEGORY_LABELS[category].toLowerCase()} shortly.
                Subscribe below to get notified.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.frontmatter.slug}
                  href={`/resources/${category}/${item.frontmatter.slug}`}
                  className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                    {item.frontmatter.difficulty ?? "Article"}
                  </span>
                  <h3 className="mt-3 font-display text-[18px] font-semibold leading-snug text-paper-900">
                    {item.frontmatter.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-[14px] leading-relaxed text-paper-600">
                    {item.frontmatter.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-[12.5px] text-paper-500">
                    <span>{item.frontmatter.author.name}</span>
                    <span>·</span>
                    <span>{item.readingMinutes} min</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
