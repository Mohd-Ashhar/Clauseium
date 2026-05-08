import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAllFeatures } from "@/lib/features";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";

export const metadata: Metadata = {
  title: "Features — AI Contract Review for Indian Counsel",
  description:
    "Every Clauseium capability — AI contract review, DPDP compliance scanning, clause drafting, playbook enforcement, and more. Built for Indian in-house counsel.",
  alternates: { canonical: "/features" },
};

export default function FeaturesIndexPage() {
  const features = getAllFeatures();

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
            trail={[{ label: "Home", href: "/" }, { label: "Features" }]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              Features
            </span>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight text-white md:text-[52px]">
              Every Clauseium capability.
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-300 md:text-[17.5px]">
              Purpose-built capabilities for Indian in-house counsel.
              Each feature is grounded in the Indian Contract Act, DPDP, and
              your own playbook.
            </p>
          </div>
        </div>
      </header>

      <section className="bg-paper-50 py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                className="group flex flex-col rounded-2xl border border-paper-200 bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-counsel-600">
                    {feature.hero.eyebrow}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-paper-400 transition-colors group-hover:text-brand-600" />
                </div>
                <h2 className="mt-4 font-display text-[19px] font-semibold text-paper-900">
                  {feature.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-paper-600">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
