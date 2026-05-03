"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Highlight({
  risk,
  index,
  children,
}: {
  risk: "high" | "med" | "low";
  index: number;
  children: ReactNode;
}) {
  const tint =
    risk === "high"
      ? "bg-risk-high/15 decoration-risk-high decoration-wavy"
      : risk === "med"
        ? "bg-risk-med/15 decoration-risk-med decoration-wavy"
        : "bg-risk-low/15 decoration-risk-low decoration-solid";
  return (
    <motion.span
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        delay: 1.0 + index * 0.8,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ transformOrigin: "left", display: "inline-block" }}
      className={cn(
        "rounded px-1 underline underline-offset-4",
        tint,
      )}
    >
      {children}
    </motion.span>
  );
}

export function HeroProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 6 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
      className="relative mx-auto"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px]"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 100%, rgba(124,92,255,0.35), transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      <div
        className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 shadow-[0_20px_80px_rgba(124,92,255,0.18),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
        style={{ transform: "rotateX(6deg)" }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex h-6 flex-1 items-center justify-center rounded-md border border-ink-700 bg-ink-800/60 px-3 font-mono text-[11px] text-ink-500">
            <span className="text-ink-700">●</span>
            <span className="ml-2">app.clauseium.com/review/vendor-msa-001</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
              Live
            </span>
          </div>
        </div>

        {/* Workspace topbar */}
        <div className="flex items-center justify-between border-b border-ink-700 bg-ink-900/40 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-ink-500">CONTRACT</span>
            <span className="text-[13px] font-medium text-ink-100">
              Vendor MSA — TechCo ↔ Clauseium Pvt Ltd
            </span>
            <Badge tone="outline" className="hidden md:inline-flex">
              v3 · in review
            </Badge>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="font-mono text-[11px] text-ink-500">
              23 clauses
            </span>
            <span className="font-mono text-[11px] text-risk-high">
              · 4 high
            </span>
            <span className="font-mono text-[11px] text-risk-med">
              · 7 medium
            </span>
          </div>
        </div>

        {/* Two-pane content */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px]">
          {/* Contract text pane */}
          <div className="bg-ink-900/30 p-6 text-[13px] leading-[1.85] text-ink-300 md:p-8">
            <div className="space-y-4 font-mono text-[12px] md:text-[13px]">
              <div>
                <span className="text-ink-500">14.</span>{" "}
                <span className="font-semibold text-ink-100">
                  Indemnification.
                </span>
              </div>
              <p>
                <span className="text-ink-500">14.1</span> Each party shall
                indemnify and hold harmless the other party from and against
                any{" "}
                <Highlight risk="high" index={0}>
                  losses, claims, damages, liabilities, costs and expenses of
                  any nature whatsoever
                </Highlight>{" "}
                arising out of or in connection with breach of this Agreement.
              </p>
              <p>
                <span className="text-ink-500">14.2</span> Notwithstanding
                clause 14.1, the aggregate liability of either party shall be{" "}
                <Highlight risk="med" index={1}>
                  limited to the fees paid in the preceding three (3) months
                </Highlight>
                , except for liability arising from gross negligence or wilful
                misconduct.
              </p>
              <div className="pt-2">
                <span className="text-ink-500">15.</span>{" "}
                <span className="font-semibold text-ink-100">
                  Governing Law &amp; Jurisdiction.
                </span>
              </div>
              <p>
                <span className="text-ink-500">15.1</span> This Agreement shall
                be governed by and construed in accordance with{" "}
                <Highlight risk="low" index={2}>
                  the laws of India and the courts at Bengaluru shall have
                  exclusive jurisdiction
                </Highlight>
                .
              </p>
              <p className="text-ink-500">
                <span>15.2</span> Any dispute arising out of or in connection
                with this Agreement shall be referred to arbitration under the
                Arbitration and Conciliation Act, 1996...
              </p>
            </div>
          </div>

          {/* Analysis pane */}
          <div className="border-t border-ink-700 bg-ink-900/60 p-5 md:border-l md:border-t-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                Clause analysis
              </span>
              <span className="font-mono text-[10px] text-brand-500">
                Live ●
              </span>
            </div>

            <ClauseCard
              id="§ 14.2"
              title="Limitation of Liability"
              risk="high"
              summary="Liability cap is 3 months of fees — well below industry standard for SaaS MSAs in India."
              streamingText="Recommend uplift to 12 months fees; add a carve-out for IP indemnity and DPDP breaches…"
              citation="ICA §73 · DPDP §33"
            />

            <ClauseCard
              id="§ 8.1"
              title="Data Protection"
              risk="med"
              summary="Missing Data Principal rights and breach notification timeline under DPDP Rules 2025."
              citation="DPDP §8(1)"
            />

            <ClauseCard
              id="§ 15.1"
              title="Governing Law"
              risk="low"
              summary="Standard India seat — Bengaluru courts. Aligns with playbook."
              citation="Playbook ✓"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ClauseCard({
  id,
  title,
  risk,
  summary,
  streamingText,
  citation,
}: {
  id: string;
  title: string;
  risk: "high" | "med" | "low";
  summary: string;
  streamingText?: string;
  citation: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-ink-700 bg-ink-850/80 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-500">{id}</span>
          <span className="text-[13px] font-semibold text-ink-100">
            {title}
          </span>
        </div>
        <Badge tone={risk}>
          {risk === "high" ? "High Risk" : risk === "med" ? "Review" : "Standard"}
        </Badge>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-300">{summary}</p>
      {streamingText && (
        <div
          className={cn(
            "mt-3 overflow-hidden border-l-2 border-brand-500/50 pl-3 text-[11.5px] leading-relaxed text-ink-300",
          )}
        >
          <span
            className="inline-block whitespace-nowrap"
            style={{
              animation: "stream-text 3.5s steps(40, end) infinite alternate",
            }}
          >
            {streamingText}
          </span>
          <span
            className="ml-1 inline-block h-3 w-[2px] bg-brand-400 align-middle"
            style={{ animation: "cursor-blink 1s steps(2) infinite" }}
          />
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-md bg-counsel-500/10 px-2 py-0.5 font-mono text-[10px] text-counsel-200 ring-1 ring-inset ring-counsel-500/20">
          {citation}
        </span>
        <span className="font-mono text-[10px] text-ink-500">verified ✓</span>
      </div>
    </div>
  );
}
