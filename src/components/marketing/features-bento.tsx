"use client";

import {
  BookCheck,
  FileCheck,
  FileText,
  PenTool,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function FeaturesBento() {
  return (
    <section
      id="features"
      className="relative bg-paper-50 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-brand-600">
            Capabilities
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            Six surfaces. One copilot.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[15px] leading-relaxed text-paper-900/60">
            Every tool Indian in-house counsel needs to review, draft, and
            negotiate contracts — grounded in the statutes that actually apply.
          </p>
        </FadeUp>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-[auto_auto_auto] md:gap-5">
          {/* Hero card — 2x2 */}
          <BentoCard
            className="md:col-span-2 md:row-span-2"
            icon={<Shield className="h-5 w-5" />}
            title="Clause-by-clause review under Indian law"
            body="Upload any contract. Clauseium identifies every clause, flags risks against the Indian Contract Act, DPDP, and FEMA, and drafts redlines grounded in your playbook."
            visual={<MiniClausesVisual />}
            visualClassName="min-h-[260px]"
          />
          {/* Tall card */}
          <BentoCard
            className="md:row-span-2"
            icon={<FileCheck className="h-5 w-5" />}
            title="Redlines that match your playbook"
            body="AI drafts suggested rewrites following your firm's contracting standards. Accept with one click or modify."
            visual={<DiffVisual />}
            visualClassName="min-h-[180px]"
          />
          {/* Wide card */}
          <BentoCard
            className="md:col-span-2"
            icon={<PenTool className="h-5 w-5" />}
            title="Draft from your own precedents"
            body="Point-and-draft from 500+ Indian commercial clause templates, or teach Clauseium your preferred language."
            visual={<TypingClauseVisual />}
          />
          {/* 3 small */}
          <BentoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="DPDP compliance scanner"
            body="Automatically checks every contract for DPDP Act compliance — consent mechanisms, breach notification, cross-border transfer clauses."
            visual={<HeatmapVisual />}
          />
          <BentoCard
            icon={<BookCheck className="h-5 w-5" />}
            title="Verified citations only"
            body="Every AI suggestion links to the actual statute or judgment. Unverified citations are blocked before you see them."
            visual={<CitationsVisual />}
          />
          <BentoCard
            icon={<FileText className="h-5 w-5" />}
            title="Works inside Microsoft Word"
            body="Review contracts without leaving Word. Our add-in brings Clauseium's analysis right into your sidebar."
            visual={<WordAddinVisual />}
          />
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  className,
  icon,
  title,
  body,
  visual,
  visualClassName,
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  body: string;
  visual?: ReactNode;
  visualClassName?: string;
}) {
  return (
    <FadeUp
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-paper-200 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/30 hover:shadow-[0_1px_2px_rgba(10,11,13,0.04),0_8px_28px_rgba(10,11,13,0.06)] md:p-8",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-900/40">
          Capability
        </span>
      </div>
      <h3 className="mt-5 font-display text-[20px] font-bold tracking-tight text-paper-900 md:text-[22px]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-paper-900/60">
        {body}
      </p>
      {visual && (
        <div
          className={cn(
            "mt-6 flex flex-1 items-end justify-center",
            visualClassName,
          )}
        >
          {visual}
        </div>
      )}
    </FadeUp>
  );
}

function MiniClausesVisual() {
  const items = [
    {
      id: "§ 14.2",
      title: "Limitation of Liability",
      risk: "high" as const,
      label: "High Risk",
      summary: "Liability cap below India SaaS standard.",
      tilt: "-rotate-2 -translate-x-2",
    },
    {
      id: "§ 8.1",
      title: "Data Protection",
      risk: "med" as const,
      label: "Review",
      summary: "Missing DPDP breach notification clause.",
      tilt: "rotate-1 translate-x-2 translate-y-2",
    },
    {
      id: "§ 15.1",
      title: "Governing Law",
      risk: "low" as const,
      label: "Standard",
      summary: "Bengaluru seat aligns with playbook.",
      tilt: "rotate-3 translate-y-4 translate-x-6",
    },
  ];
  const borderMap = {
    high: "border-l-risk-high",
    med: "border-l-risk-med",
    low: "border-l-risk-low",
  } as const;

  return (
    <div className="relative w-full">
      {items.map((it, i) => (
        <div
          key={it.id}
          className={cn(
            "absolute right-0 w-[280px] rounded-xl border border-paper-200 border-l-4 bg-white p-3.5 shadow-[0_8px_24px_rgba(10,11,13,0.06)]",
            borderMap[it.risk],
            it.tilt,
          )}
          style={{ top: `${i * 64}px`, zIndex: 10 - i }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-paper-900/50">
              {it.id}
            </span>
            <Badge tone={it.risk}>{it.label}</Badge>
          </div>
          <div className="mt-1.5 text-[13px] font-semibold text-paper-900">
            {it.title}
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-paper-900/60">
            {it.summary}
          </p>
        </div>
      ))}
      <div className="h-[210px]" />
    </div>
  );
}

function DiffVisual() {
  return (
    <div className="w-full rounded-xl border border-paper-200 bg-paper-50/60 p-4 font-mono text-[11.5px] leading-relaxed">
      <div className="text-paper-900/40">§ 9.3 Term &amp; termination</div>
      <div className="mt-1.5 rounded bg-risk-high/10 px-2 py-1 text-risk-high line-through">
        Either party may terminate without cause with 90 days notice.
      </div>
      <div className="mt-1.5 rounded bg-risk-low/10 px-2 py-1 text-paper-900">
        Either party may terminate{" "}
        <span className="font-semibold text-risk-low">for material breach</span>{" "}
        with 30 days written notice and cure period.
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-risk-low/10 px-2.5 py-1 text-[10px] font-semibold text-risk-low">
        <span>✓</span> Accepted · matches playbook v4
      </div>
    </div>
  );
}

function TypingClauseVisual() {
  return (
    <div className="w-full rounded-xl border border-paper-200 bg-paper-900/[0.02] p-4 font-mono text-[12px] leading-relaxed text-paper-900/80">
      <div className="text-paper-900/40">§ 12 Indemnification (drafting…)</div>
      <p className="mt-2">
        Each party shall indemnify the other against claims arising from
        its{" "}
        <span className="bg-brand-500/15 px-1 text-brand-600">
          breach, gross negligence, or wilful misconduct
        </span>
        , capped at the fees paid in the preceding{" "}
        <span className="bg-brand-500/15 px-1 text-brand-600">12 months</span>
        <span
          className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] bg-brand-500"
          style={{ animation: "cursor-blink 1s steps(2) infinite" }}
        />
      </p>
    </div>
  );
}

function HeatmapVisual() {
  const cells: ("low" | "med" | "high")[] = [
    "low",
    "low",
    "med",
    "low",
    "high",
    "low",
    "med",
    "low",
    "low",
  ];
  const colorMap = {
    high: "bg-risk-high/30 ring-risk-high/40",
    med: "bg-risk-med/30 ring-risk-med/40",
    low: "bg-risk-low/30 ring-risk-low/40",
  };
  return (
    <div className="grid w-full grid-cols-3 gap-1.5 max-w-[140px]">
      {cells.map((c, i) => (
        <div
          key={i}
          className={cn(
            "aspect-square rounded-md ring-1 ring-inset",
            colorMap[c],
          )}
        />
      ))}
    </div>
  );
}

function CitationsVisual() {
  const cites = [
    { ref: "§73 Indian Contract Act", ok: true },
    { ref: "DPDP §8(1)", ok: true },
    { ref: "Companies Act §188", ok: true },
  ];
  return (
    <div className="flex w-full flex-col gap-2">
      {cites.map((c) => (
        <div
          key={c.ref}
          className="flex items-center justify-between rounded-lg border border-paper-200 bg-white px-3 py-1.5 font-mono text-[11.5px] text-paper-900/80"
        >
          <span>{c.ref}</span>
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-risk-low/15 text-[10px] text-risk-low">
            ✓
          </span>
        </div>
      ))}
    </div>
  );
}

function WordAddinVisual() {
  return (
    <div className="flex w-full items-stretch gap-2 rounded-xl border border-paper-200 bg-white p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#185abd] font-display text-lg font-bold text-white">
        W
      </div>
      <div className="flex-1 rounded-md bg-paper-100 p-2">
        <div className="h-1.5 w-3/4 rounded bg-paper-200" />
        <div className="mt-1.5 h-1.5 w-1/2 rounded bg-paper-200" />
        <div className="mt-2 inline-block rounded-sm bg-brand-500/15 px-1.5 py-0.5 font-mono text-[9px] text-brand-600">
          Clauseium add-in
        </div>
      </div>
    </div>
  );
}
