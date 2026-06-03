import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Pricing } from "@/components/marketing/pricing";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { StructuredData } from "@/components/resources/structured-data";
import { Button } from "@/components/ui/button";
import {
  generateBreadcrumbSchemaForPath,
  generateHomepageFAQSchema,
  generateProductSchema,
  type FAQItem,
} from "@/lib/schema-marketing";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing — AI Contract Review for Indian Counsel",
  description:
    "Transparent pricing for Clauseium, India's AI contract review platform. Three tiers from ₹2,999/user/month. 14-day free trial. No per-contract fees. GST included.",
  alternates: { canonical: "/pricing" },
};

const PRICING_FAQS: FAQItem[] = [
  {
    q: "Is there a free trial?",
    a: "Yes. Every paid tier includes a 14-day free trial. No credit card required. You can review up to 5 contracts during the trial with full access to clause analysis, risk flagging, and Word add-in features.",
  },
  {
    q: "How does Indian GST apply to your pricing?",
    a: "All listed prices are exclusive of 18% GST applicable on SaaS subscriptions in India. Your invoice will show GST separately. Indian B2B customers can claim input tax credit. Foreign customers pay zero-rated as export of services.",
  },
  {
    q: "What's the difference between Counsel and Chambers?",
    a: "Counsel (₹2,999/user/month annual) is for solo GCs and teams up to 3 seats with 50 reviews/month. Chambers (₹4,999/user/month annual) supports 4-25 seats with unlimited reviews, custom playbook engine, clause benchmarking, SSO, and API access. Most Indian in-house teams of 5+ start on Chambers.",
  },
  {
    q: "What does Enterprise include?",
    a: "Enterprise is custom-priced for 25+ seat deployments. Includes private deployment (single-tenant on AWS Mumbai), dedicated CSM, custom integrations (Workday, SAP, Oracle), SLA guarantees, audit compliance reports, and on-premise deployment option for BFSI and regulated entities.",
  },
  {
    q: "Can I change plans mid-cycle?",
    a: "Yes. You can upgrade at any time and pay the prorated difference. Downgrades take effect at the next renewal. Annual plans can be paid monthly via Razorpay autopay; we don't lock you into upfront payment.",
  },
  {
    q: "Do you offer discounts for non-profits or law firms?",
    a: "Yes. Registered Section 8 companies and Bar Council-enrolled solo advocates get 30% off Counsel and Chambers. Email hello@clauseium.com with your registration certificate to apply.",
  },
];

interface ComparisonRow {
  feature: string;
  counsel: string | boolean;
  chambers: string | boolean;
  enterprise: string | boolean;
}

const COMPARISON: ComparisonRow[] = [
  { feature: "Contract reviews per month", counsel: "50", chambers: "Unlimited", enterprise: "Unlimited" },
  { feature: "Seats included", counsel: "Up to 3", chambers: "4-25", enterprise: "Unlimited" },
  { feature: "AI clause drafting", counsel: true, chambers: true, enterprise: true },
  { feature: "DPDP compliance scan", counsel: true, chambers: true, enterprise: true },
  { feature: "Indian law citations", counsel: true, chambers: true, enterprise: true },
  { feature: "Microsoft Word add-in", counsel: true, chambers: true, enterprise: true },
  { feature: "Standard playbook templates", counsel: true, chambers: true, enterprise: true },
  { feature: "Custom playbook engine", counsel: false, chambers: true, enterprise: true },
  { feature: "Clause benchmarking", counsel: false, chambers: true, enterprise: true },
  { feature: "Team collaboration", counsel: false, chambers: true, enterprise: true },
  { feature: "API access", counsel: false, chambers: true, enterprise: true },
  { feature: "SSO (SAML, Okta)", counsel: false, chambers: true, enterprise: true },
  { feature: "Private single-tenant deployment", counsel: false, chambers: false, enterprise: true },
  { feature: "Dedicated CSM", counsel: false, chambers: false, enterprise: true },
  { feature: "Custom integrations", counsel: false, chambers: false, enterprise: true },
  { feature: "SLA guarantee", counsel: false, chambers: false, enterprise: true },
  { feature: "On-premise deployment", counsel: false, chambers: false, enterprise: true },
  { feature: "Support", counsel: "Email", chambers: "Priority", enterprise: "24/7 + CSM" },
];

export default function PricingPage() {
  const schemas = [
    generateProductSchema(),
    generateHomepageFAQSchema(PRICING_FAQS),
    generateBreadcrumbSchemaForPath([
      { name: "Home", url: SITE },
      { name: "Pricing", url: `${SITE}/pricing` },
    ]),
  ].filter(Boolean) as object[];

  return (
    <>
      <StructuredData schemas={schemas} />

      <header className="relative overflow-hidden bg-ink-950 pt-28 pb-12">
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
            trail={[{ label: "Home", href: "/" }, { label: "Pricing" }]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 text-[10.5px] uppercase tracking-[0.16em] text-counsel-200">
              Pricing
            </span>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight text-white md:text-[52px]">
              Pricing for India&apos;s AI Contract Review Platform.
            </h1>
            <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-ink-300 md:text-[17.5px]">
              Three plans. No per-contract fees. 14-day free trial. All
              prices in INR, exclusive of 18% GST. Cancel anytime.
            </p>
          </div>
        </div>
      </header>

      <Pricing />

      {/* Detailed comparison table */}
      <section className="bg-paper-50 pb-20">
        <div className="mx-auto max-w-[1240px] px-6">
          <h2 className="font-display text-[26px] font-bold tracking-tight text-paper-900 md:text-[32px]">
            Compare every feature
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-paper-700">
            A full breakdown of what&apos;s included in each plan.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-paper-200 bg-white">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-paper-200 bg-paper-100">
                  <th className="px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-paper-600">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center font-display text-[15px] font-semibold text-paper-900">
                    Counsel
                  </th>
                  <th className="border-x border-counsel-200 bg-counsel-50/40 px-6 py-4 text-center font-display text-[15px] font-semibold text-counsel-600">
                    Chambers
                  </th>
                  <th className="px-6 py-4 text-center font-display text-[15px] font-semibold text-paper-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-paper-200 last:border-b-0">
                    <td className="px-6 py-3.5 font-medium text-paper-900">
                      {row.feature}
                    </td>
                    <Cell value={row.counsel} />
                    <Cell value={row.chambers} highlighted />
                    <Cell value={row.enterprise} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <TrustBadges />

      {/* FAQ */}
      <section className="bg-paper-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-counsel-600">
            FAQ
          </p>
          <h2 className="mt-3 text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            Pricing questions, answered.
          </h2>
          <dl className="mt-10 divide-y divide-paper-200 rounded-2xl border border-paper-200 bg-white">
            {PRICING_FAQS.map((item) => (
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
            Ready to ship faster contracts?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-300">
            14-day free trial. No credit card required. First 5 contracts
            free.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href="/signup">
                Start free trial
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/resources">Browse resources</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Cell({
  value,
  highlighted = false,
}: {
  value: string | boolean;
  highlighted?: boolean;
}) {
  const cellClass = highlighted
    ? "border-x border-counsel-200 bg-counsel-50/40"
    : "";

  if (typeof value === "boolean") {
    return (
      <td className={`px-6 py-3.5 text-center ${cellClass}`}>
        {value ? (
          <Check className="mx-auto h-4 w-4 text-counsel-600" aria-label="Included" />
        ) : (
          <Minus className="mx-auto h-4 w-4 text-paper-400" aria-label="Not included" />
        )}
      </td>
    );
  }
  return (
    <td className={`px-6 py-3.5 text-center text-paper-900/80 ${cellClass}`}>
      {value}
    </td>
  );
}
