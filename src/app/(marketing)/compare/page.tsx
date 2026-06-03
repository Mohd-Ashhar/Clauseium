import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getContentByCategory } from "@/lib/content";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { MoatsComparison } from "@/components/marketing/moats-comparison";

export const metadata: Metadata = {
  title: "Clauseium Comparisons — vs SpotDraft, Spellbook, Harvey & More",
  description:
    "Compare Clauseium against SpotDraft, Spellbook, Harvey, and other AI contract review platforms. See feature-by-feature breakdowns built for Indian counsel.",
  alternates: { canonical: "/compare" },
};

export default async function CompareIndexPage() {
  const items = await getContentByCategory("comparisons");

  return (
    <>
      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] h-[440px] w-[440px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.30), rgba(201,164,73,0.05) 60%, rgba(201,164,73,0) 80%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <Breadcrumbs
            trail={[{ label: "Home", href: "/" }, { label: "Compare" }]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              Compare
            </span>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight text-white md:text-[52px]">
              Clauseium vs the alternatives.
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-300 md:text-[17.5px]">
              Honest, feature-level comparisons against the AI contract
              review tools Indian counsel actually evaluate.
            </p>
          </div>
        </div>
      </header>

      <MoatsComparison />

      <section className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-300 bg-white p-12 text-center">
              <h2 className="font-display text-[20px] font-semibold text-paper-900">
                Coming soon
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-paper-600">
                We&apos;re publishing the first comparisons shortly. Sign up
                for early access.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.frontmatter.slug}
                  href={`/compare/${item.frontmatter.slug}`}
                  className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-counsel-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                      Comparison
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-paper-400 transition-colors group-hover:text-counsel-600" />
                  </div>
                  <h3 className="mt-3 font-display text-[18px] font-semibold leading-snug text-paper-900">
                    {item.frontmatter.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-[14px] leading-relaxed text-paper-600">
                    {item.frontmatter.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
