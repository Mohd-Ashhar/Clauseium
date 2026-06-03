"use client";

import {
  AlertTriangle,
  BookCheck,
  CheckCircle2,
  FileCheck,
  FileText,
  PenTool,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function FeaturesBento() {
  return (
    <section
      id="features"
      className="relative bg-paper-50 py-20 md:py-32"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(10,11,13,0.035) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-counsel-600">
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
          {/* Hero card — 2x2 — DARK */}
          <BentoCard
            tone="dark"
            heroBadge
            className="md:col-span-2 md:row-span-2"
            icon={<Shield className="h-5 w-5" />}
            title="Catch what outside counsel misses"
            body="Upload any contract. Clauseium identifies every clause, flags risks against the Indian Contract Act, DPDP, and FEMA, and drafts redlines grounded in your playbook."
            visual={<HeroClausesVisual />}
            visualClassName="md:min-h-[280px]"
          />
          {/* Tall card */}
          <BentoCard
            className="md:row-span-2"
            icon={<FileCheck className="h-5 w-5" />}
            title="Your standards, enforced automatically"
            body="AI drafts suggested rewrites following your firm's contracting standards. Accept with one click or modify."
            visual={<DiffVisual />}
            visualClassName="min-h-[180px]"
          />
          {/* Wide card */}
          <BentoCard
            className="md:col-span-2"
            icon={<PenTool className="h-5 w-5" />}
            title="Draft in seconds, not hours"
            body="Point-and-draft from 500+ Indian commercial clause templates, or teach Clauseium your preferred language."
            visual={<TypingClauseVisual />}
          />
          {/* 3 small */}
          <BentoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="DPDP-ready before the deadline"
            body="Automatically checks every contract for DPDP Act compliance — consent mechanisms, breach notification, cross-border transfer clauses."
            visual={<DpdpChecklistVisual />}
          />
          <BentoCard
            icon={<BookCheck className="h-5 w-5" />}
            title="Zero hallucinated citations. Guaranteed."
            body="Every AI suggestion links to the actual statute or judgment. Unverified citations are blocked before you see them."
            visual={<CitationsVisual />}
          />
          <BentoCard
            icon={<FileText className="h-5 w-5" />}
            title="Never leave Word"
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
  tone = "light",
  heroBadge,
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  body: string;
  visual?: ReactNode;
  visualClassName?: string;
  tone?: "light" | "dark";
  heroBadge?: boolean;
}) {
  const isDark = tone === "dark";
  return (
    <FadeUp
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 md:p-8",
        isDark
          ? "border-ink-700 bg-ink-900 text-ink-100 hover:border-counsel-500/50 hover:shadow-[0_8px_32px_rgba(201,164,73,0.18)]"
          : "border-paper-200 bg-white hover:border-counsel-500/30 hover:shadow-[0_4px_20px_rgba(201,164,73,0.08)]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
            isDark
              ? "bg-counsel-500/15 text-counsel-200"
              : "bg-counsel-500/10 text-counsel-500",
          )}
        >
          {icon}
        </span>
        {heroBadge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-counsel-500/15 px-2.5 py-0.5 text-[11px] font-medium text-counsel-200">
            <span className="h-1.5 w-1.5 rounded-full bg-counsel-200" />
            Core feature
          </span>
        )}
      </div>
      <h3
        className={cn(
          "mt-5 font-display text-[20px] font-bold tracking-tight md:text-[22px]",
          isDark ? "text-white" : "text-paper-900",
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "mt-2 max-w-md text-[14.5px] leading-relaxed",
          isDark ? "text-ink-300" : "text-paper-900/60",
        )}
      >
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

/* ────────────────────────────────────────────────────
   Hero card visual — fan of clause cards (now on dark)
   ──────────────────────────────────────────────────── */
function HeroClausesVisual() {
  const items = [
    {
      id: "§ 14.2",
      title: "Limitation of Liability",
      risk: "high" as const,
      label: "High Risk",
      summary: "Liability cap below India SaaS standard.",
      tilt: "-rotate-2 -translate-x-3",
      borderColor: "border-l-risk-high",
    },
    {
      id: "§ 8.1",
      title: "Data Protection",
      risk: "med" as const,
      label: "Review",
      summary: "Missing DPDP breach notification clause.",
      tilt: "rotate-1 translate-x-3 translate-y-3",
      borderColor: "border-l-risk-med",
    },
    {
      id: "§ 15.1",
      title: "Governing Law",
      risk: "low" as const,
      label: "Standard",
      summary: "Bengaluru seat aligns with playbook.",
      tilt: "rotate-3 translate-y-6 translate-x-8",
      borderColor: "border-l-risk-low",
    },
  ];

  return (
    <div className="w-full">
      {/* Mobile: clean vertical stack — no rotation, no overflow */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.map((it) => (
          <div
            key={it.id}
            className={cn(
              "w-full rounded-xl border border-ink-700 border-l-[4px] bg-ink-850 p-4 shadow-[0_4px_16px_rgba(201,164,73,0.10)]",
              it.borderColor,
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink-500">
                {it.id}
              </span>
              <Badge tone={it.risk}>{it.label}</Badge>
            </div>
            <div className="mt-1.5 text-[13.5px] font-semibold text-white">
              {it.title}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-300">
              {it.summary}
            </p>
          </div>
        ))}
      </div>

      {/* md+: dramatic fan layout (original behaviour) */}
      <div className="relative hidden md:block">
        {items.map((it, i) => (
          <div
            key={it.id}
            className={cn(
              "absolute right-0 w-[280px] rounded-xl border border-ink-700 border-l-[4px] bg-ink-850 p-4 shadow-[0_8px_32px_rgba(201,164,73,0.12)] backdrop-blur",
              it.borderColor,
              it.tilt,
            )}
            style={{ top: `${i * 72}px`, zIndex: 10 - i }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink-500">
                {it.id}
              </span>
              <Badge tone={it.risk}>{it.label}</Badge>
            </div>
            <div className="mt-1.5 text-[13.5px] font-semibold text-white">
              {it.title}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-300">
              {it.summary}
            </p>
          </div>
        ))}
        <div className="h-[240px]" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Diff card
   ──────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────
   Typing clause card — CSS typewriter
   ──────────────────────────────────────────────────── */
function TypingClauseVisual() {
  return (
    <div className="w-full rounded-xl border border-paper-200 bg-paper-900/[0.02] p-4 font-mono text-[12.5px] leading-[1.85] text-paper-900/80">
      <div className="text-paper-900/40">§ 12 Indemnification (drafting…)</div>
      <div className="mt-2 overflow-hidden">
        <span
          className="inline-block whitespace-nowrap border-r-2 border-counsel-500 align-bottom"
          style={{
            animation:
              "bento-typewriter 6s steps(80, end) infinite, bento-caret 0.75s step-end infinite",
            maxWidth: "0",
            animationFillMode: "forwards",
          }}
        >
          Each party indemnifies the other against breach, capped at 12 months
          fees.
        </span>
      </div>
      <p className="mt-2 text-[11.5px] text-paper-900/45">
        Sourced from playbook v4 · ICA §73 verified
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   DPDP compliance checklist (replaces heatmap)
   ──────────────────────────────────────────────────── */
function DpdpChecklistVisual() {
  const items: {
    label: string;
    status: "found" | "missing" | "noncompliant";
    note: string;
  }[] = [
    { label: "Consent mechanism", status: "found", note: "Found" },
    { label: "Breach notification", status: "missing", note: "Missing" },
    { label: "DPA clause", status: "found", note: "Found" },
    {
      label: "Cross-border transfer",
      status: "noncompliant",
      note: "Non-compliant",
    },
    { label: "Data Principal rights", status: "found", note: "Found" },
  ];
  return (
    <div className="flex w-full flex-col gap-1.5">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center justify-between rounded-md bg-paper-100/70 px-2.5 py-1.5 text-[11.5px]"
        >
          <span className="flex items-center gap-2 text-paper-900/75">
            {it.status === "found" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-risk-low" />
            )}
            {it.status === "missing" && (
              <AlertTriangle className="h-3.5 w-3.5 text-risk-med" />
            )}
            {it.status === "noncompliant" && (
              <XCircle className="h-3.5 w-3.5 text-risk-high" />
            )}
            {it.label}
          </span>
          <span
            className={cn(
              "font-mono text-[10px]",
              it.status === "found" && "text-risk-low",
              it.status === "missing" && "text-risk-med",
              it.status === "noncompliant" && "text-risk-high",
            )}
          >
            {it.note}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Citation chips (upgraded)
   ──────────────────────────────────────────────────── */
function CitationsVisual() {
  const cites = [
    "§73 Indian Contract Act",
    "DPDP §8(1)",
    "Companies Act §188",
  ];
  return (
    <div className="flex w-full flex-col gap-2">
      {cites.map((ref, i) => (
        <div
          key={ref}
          className="flex items-center justify-between gap-2 rounded-lg border border-paper-200 bg-paper-100 px-3 py-2"
          style={{
            opacity: 0,
            animation: `bento-fade-in 0.5s ease-out ${0.15 * i}s forwards`,
          }}
        >
          <span className="font-mono text-[11.5px] text-paper-900/75">
            {ref}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-low">
            <CheckCircle2 className="h-3.5 w-3.5" />
            verified
          </span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Word add-in card visual
   ──────────────────────────────────────────────────── */
function WordAddinVisual() {
  return (
    <div className="flex w-full items-stretch gap-2 rounded-xl border border-paper-200 bg-white p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#185abd] font-display text-lg font-bold text-white">
        W
      </div>
      <div className="flex-1 rounded-md bg-paper-100 p-2">
        <div className="h-1.5 w-3/4 rounded bg-paper-200" />
        <div className="mt-1.5 h-1.5 w-1/2 rounded bg-paper-200" />
        <div className="mt-2 inline-block rounded-sm bg-counsel-500/15 px-1.5 py-0.5 font-mono text-[9px] text-counsel-600">
          Clauseium add-in
        </div>
      </div>
    </div>
  );
}
