import type { Metadata } from "next";
import Link from "next/link";
import {
  Cloud,
  Database,
  FileLock2,
  Lock,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/resources/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security & Data Protection",
  description:
    "How Clauseium protects your contracts: zero data retention with LLM providers, DPDP-aligned 30-day retention, AWS Mumbai data residency, encryption, tenant isolation, and a complete audit trail.",
  alternates: { canonical: "/security" },
};

const liveToday = [
  {
    icon: Database,
    title: "Zero data retention with LLM providers",
    body: "We use Anthropic's zero-data-retention endpoint. Your contract text is never stored by the model provider and never used to train foundation models.",
  },
  {
    icon: FileLock2,
    title: "DPDP-aligned retention",
    body: "Contract text is auto-deleted after 30 days unless you explicitly opt in via a separable consent toggle. You can request earlier deletion at any time.",
  },
  {
    icon: Cloud,
    title: "Data residency in AWS Mumbai",
    body: "Storage and processing stay in the ap-south-1 region. Your data does not leave India.",
  },
  {
    icon: Lock,
    title: "Encryption in transit and at rest",
    body: "TLS 1.2+ in transit and AES-256 at rest across storage and backups.",
  },
  {
    icon: Users,
    title: "Tenant isolation",
    body: "Every query is tenant-scoped with row-level security plus explicit owner checks — defence in depth, not RLS alone.",
  },
  {
    icon: ScrollText,
    title: "Complete audit trail",
    body: "Every upload, clause action, redline, and export is logged so you can reconstruct exactly what happened and when.",
  },
];

const inProgress = [
  { label: "SOC 2 Type II", note: "Audit in progress" },
  { label: "ISO 27001", note: "Implementation underway" },
  { label: "ISO 42001 (AI management)", note: "Implementation underway" },
];

export default function SecurityPage() {
  return (
    <>
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
            trail={[{ label: "Home", href: "/" }, { label: "Security" }]}
            variant="dark"
          />
          <div className="mt-8 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-counsel-500/30 bg-counsel-500/10 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-counsel-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security
            </span>
            <h1 className="mt-5 font-display text-[40px] font-medium leading-[1.1] tracking-tight text-white md:text-[52px]">
              Security &amp; data protection, built for Indian counsel.
            </h1>
            <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-ink-300 md:text-[17.5px]">
              You&apos;re handing us your most sensitive contracts. Here is
              exactly how we protect them — and what we will and won&apos;t do
              with your data. We&apos;d rather under-claim and show our work.
            </p>
          </div>
        </div>
      </header>

      <section className="bg-paper-50 py-16 md:py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-counsel-600">
            Live today
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.6rem,2vw+0.5rem,2.2rem)] font-medium tracking-[-0.01em] text-paper-900">
            What protects your contracts right now
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {liveToday.map(({ icon: Icon, title, body }) => (
              <Card key={title} surface="light" padding="md">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-counsel-500/10 text-counsel-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-[16px] font-medium text-paper-900">
                  {title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-paper-900/65">
                  {body}
                </p>
              </Card>
            ))}
          </div>

          <div id="dpdp" className="mt-12 rounded-2xl border border-counsel-500/25 bg-counsel-500/6 p-6 md:p-8">
            <h3 className="font-display text-[18px] font-medium text-paper-900">
              The DPDP wedge
            </h3>
            <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-paper-900/70">
              Global tools weren&apos;t built for India&apos;s Digital Personal
              Data Protection Act, 2023. Clauseium treats DPDP as a first-class
              constraint: separable consent for retention, data residency in
              India, zero retention with model providers, and a deletion path you
              control — so your use of AI on third-party contract data stays
              defensible.
            </p>
          </div>

          <div className="mt-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-counsel-600">
              Certifications in progress
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.4rem,1.5vw+0.5rem,1.9rem)] font-medium tracking-[-0.01em] text-paper-900">
              We&apos;ll show the certificate, not just the badge
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-paper-900/60">
              We&apos;re a private-beta company and we won&apos;t display a
              compliance badge we haven&apos;t earned. Here&apos;s our honest
              status:
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {inProgress.map(({ label, note }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-lg border border-paper-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-paper-900/75"
                >
                  {label}
                  <span className="rounded-full bg-paper-100 px-2 py-0.5 text-[11px] font-normal text-paper-900/50">
                    {note}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col items-start gap-4 border-t border-paper-200 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[14.5px] leading-relaxed text-paper-900/70">
              Need a security review, DPA, or a copy of our sub-processor list?
              We&apos;ll walk your team through it.
            </p>
            <Button variant="primary" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
