"use client";

import { useState } from "react";
import { FadeUp } from "@/components/motion/fade-up";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type TabKey = "nda" | "msa" | "employment";

const tabs: { key: TabKey; label: string }[] = [
  { key: "nda", label: "NDA Review" },
  { key: "msa", label: "Vendor MSA" },
  { key: "employment", label: "Employment Agreement" },
];

const tabContent: Record<
  TabKey,
  { title: string; bullets: string[] }
> = {
  msa: {
    title: "What Clauseium caught in a typical vendor MSA",
    bullets: [
      "Liability cap was 3 months of fees — flagged as below India SaaS norm; suggested 12 months with carve-outs.",
      "Missing DPDP §8(1) Data Principal rights and breach notification timeline under Rules 2025.",
      "Cross-border data transfer clause referenced GDPR but not DPDP — redrafted to comply with both.",
      "Indemnity scope didn't carve out IP infringement — playbook deviation flagged.",
    ],
  },
  nda: {
    title: "What Clauseium caught in a mutual NDA",
    bullets: [
      "Definition of Confidential Information missed oral disclosures — extended per Indian Contract Act §27 jurisprudence.",
      "Survival clause was 2 years — playbook standard is 5 for trade secrets. Auto-redlined.",
      "Injunctive relief language was UK-style — rewrote to align with CPC Order 39 and Indian Specific Relief Act.",
      "No carve-out for residual knowledge — added per playbook for tech engagements.",
    ],
  },
  employment: {
    title: "What Clauseium caught in an employment agreement",
    bullets: [
      "Non-compete extended for 24 months post-termination — flagged as unenforceable under §27 Indian Contract Act.",
      "ESOP vesting schedule didn't reference the Companies Act §62 process — added compliance language.",
      "Garden leave terms exceeded notice period — redrafted to match Indian labour norms.",
      "Missing DPDP-compliant employee data processing clauses — added consent and purpose limitations.",
    ],
  },
};

export function ProductShowcase() {
  const [active, setActive] = useState<TabKey>("msa");

  return (
    <section
      id="showcase"
      className="bg-paper-50 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-brand-600">
            Inside the workspace
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            See Clauseium reason through a real contract
          </h2>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <FadeUp delay={0.1}>
            <ShowcaseMockup />
          </FadeUp>

          <FadeUp delay={0.2} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-xl border border-paper-200 bg-white p-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-3 text-left text-[14px] transition-all",
                    active === t.key
                      ? "bg-brand-500/10 text-paper-900"
                      : "text-paper-900/60 hover:bg-paper-100",
                  )}
                >
                  <span className="font-medium">{t.label}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      active === t.key ? "bg-brand-500" : "bg-paper-200",
                    )}
                  />
                </button>
              ))}
            </div>

            <div>
              <h3 className="font-display text-[20px] font-semibold tracking-tight text-paper-900">
                {tabContent[active].title}
              </h3>
              <ul className="mt-4 space-y-3">
                {tabContent[active].bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-risk-low/15 text-risk-low">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-[14.5px] leading-relaxed text-paper-900/75">
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function ShowcaseMockup() {
  return (
    <div className="relative">
      <div
        className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900"
        style={{
          animation: "subtle-glow-pulse 4.5s ease-in-out infinite",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
              Contract
            </span>
            <span className="text-[12.5px] font-medium text-ink-100">
              MSA — TechCo / Clauseium
            </span>
            <Badge tone="outline">v3</Badge>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-mono text-[10px] text-risk-high">
              4 high
            </span>
            <span className="font-mono text-[10px] text-risk-med">7 med</span>
            <span className="font-mono text-[10px] text-risk-low">
              12 ok
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px]">
          <div className="space-y-3 p-5 font-mono text-[11.5px] leading-relaxed text-ink-300">
            <p className="text-ink-500">§ 14 Indemnification</p>
            <p>
              Each party shall indemnify the other against{" "}
              <span className="bg-risk-high/15 underline decoration-risk-high decoration-wavy underline-offset-4">
                any losses, claims, damages of any nature whatsoever
              </span>{" "}
              arising out of breach.
            </p>
            <p className="text-ink-500">§ 15 Data Protection</p>
            <p>
              The Service Provider shall{" "}
              <span className="bg-risk-med/15 underline decoration-risk-med decoration-wavy underline-offset-4">
                comply with applicable data protection laws
              </span>{" "}
              and notify the Customer of breaches.
            </p>
            <p className="text-ink-500">§ 16 Governing Law</p>
            <p>
              Governed by{" "}
              <span className="bg-risk-low/15 underline decoration-risk-low underline-offset-4">
                laws of India; Bengaluru courts
              </span>
              .
            </p>
          </div>
          <div className="border-t border-ink-700 bg-ink-850/40 p-4 md:border-l md:border-t-0">
            <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-ink-500">
                  § 14
                </span>
                <Badge tone="high">High</Badge>
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-300">
                Uncapped indemnity — recommend mutual cap.
              </p>
              <span className="mt-2 inline-block rounded bg-counsel-500/10 px-1.5 py-0.5 font-mono text-[9px] text-counsel-200">
                ICA §73 ✓
              </span>
            </div>
            <div className="mt-3 rounded-lg border border-ink-700 bg-ink-850 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-ink-500">
                  § 15
                </span>
                <Badge tone="med">Review</Badge>
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-300">
                Add DPDP §8(1) Data Principal rights.
              </p>
              <span className="mt-2 inline-block rounded bg-counsel-500/10 px-1.5 py-0.5 font-mono text-[9px] text-counsel-200">
                DPDP §8(1) ✓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating annotations */}
      <Annotation
        className="left-[-12px] top-[110px] hidden lg:flex"
        text="AI-scored risk level"
      />
      <Annotation
        className="right-[-16px] top-[210px] hidden lg:flex"
        text="One-click accept / reject"
      />
      <Annotation
        className="bottom-[40px] left-[20px] hidden lg:flex"
        text="Verified legal citation"
      />
    </div>
  );
}

function Annotation({
  className,
  text,
}: {
  className?: string;
  text: string;
}) {
  return (
    <div
      className={cn(
        "absolute z-10 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 font-mono text-[10px] text-brand-600 shadow-[0_4px_20px_rgba(124,92,255,0.15)] backdrop-blur",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      {text}
    </div>
  );
}
