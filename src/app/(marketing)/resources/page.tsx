import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BookOpen } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  getAllContent,
  getCategoriesInUse,
} from "@/lib/content";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free Indian-law-compliant contract templates, DPDP compliance guides, and clause deep-dives — all reviewed by Bar Council-enrolled advocates.",
  alternates: { canonical: "/resources" },
};

export default async function ResourcesHubPage() {
  const all = await getAllContent();
  const categoriesInUse = await getCategoriesInUse();
  const featured = all.slice(0, 6);

  return (
    <>
      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-20">
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
            trail={[{ label: "Home", href: "/" }, { label: "Resources" }]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              <BookOpen className="h-3 w-3" />
              Indian legal resources
            </span>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight text-white md:text-[52px]">
              Templates, guides, and clause deep-dives for Indian counsel.
            </h1>
            <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-ink-300 md:text-[18px]">
              Every resource is drafted under Indian law and reviewed by a Bar
              Council-enrolled advocate. Free to read, free to download.
            </p>
          </div>
        </div>
      </header>

      <section className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <h2 className="font-display text-[22px] font-semibold tracking-tight text-paper-900">
            Browse by category
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const isLive = categoriesInUse.includes(cat);
              return (
                <Link
                  key={cat}
                  href={`/resources/${cat}`}
                  className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                      {isLive ? "Live" : "Coming soon"}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-paper-400 transition-colors group-hover:text-brand-600" />
                  </div>
                  <h3 className="mt-4 font-display text-[19px] font-semibold text-paper-900">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-paper-600">
                    {CATEGORY_DESCRIPTIONS[cat]}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="bg-paper-50 pb-20">
          <div className="mx-auto max-w-[1240px] px-6">
            <h2 className="font-display text-[22px] font-semibold tracking-tight text-paper-900">
              Latest articles
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((item) => (
                <Link
                  key={`${item.frontmatter.category}-${item.frontmatter.slug}`}
                  href={`/resources/${item.frontmatter.category}/${item.frontmatter.slug}`}
                  className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                    {CATEGORY_LABELS[item.frontmatter.category]}
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
          </div>
        </section>
      )}
    </>
  );
}
