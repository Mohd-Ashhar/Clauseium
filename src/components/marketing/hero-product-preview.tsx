"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
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
        delay: 0.4 + index * 0.18,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ transformOrigin: "left", display: "inline-block" }}
      className={cn("rounded px-1 underline underline-offset-4", tint)}
    >
      {children}
    </motion.span>
  );
}

export function HeroProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
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
            "radial-gradient(60% 40% at 50% 100%, rgba(201,164,73,0.35), transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 shadow-[0_20px_80px_rgba(201,164,73,0.18),0_0_0_1px_rgba(255,255,255,0.04)_inset] md:transform-[rotateX(6deg)]">
        {/* Document header — a quiet review toolbar, not browser chrome */}
        <div className="flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900/60 px-5 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <FileText className="h-4 w-4 shrink-0 text-counsel-500" />
            <span className="truncate font-[family-name:var(--font-display)] text-[14px] font-medium text-ink-100">
              Vendor MSA — TechCo ↔ Clauseium Pvt Ltd
            </span>
            <Badge tone="outline" className="hidden md:inline-flex">
              v3 · in review
            </Badge>
          </div>
          <div className="hidden items-center gap-2.5 text-[12px] md:flex">
            <span className="text-ink-500">23 clauses</span>
            <span className="text-risk-high">· 4 high</span>
            <span className="text-risk-med">· 7 medium</span>
          </div>
        </div>

        {/* Two-pane content: document + live analysis */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px]">
          {/* Contract document pane — reads like a contract, not code */}
          <div className="bg-ink-900/30 p-6 text-[13.5px] leading-[1.9] text-ink-300 md:p-8">
            <div className="space-y-4">
              <div>
                <span className="text-ink-500">14.</span>{" "}
                <span className="font-medium text-ink-100">Indemnification.</span>
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
                <span className="font-medium text-ink-100">
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
                Arbitration and Conciliation Act, 1996…
              </p>
            </div>
          </div>

          {/* Analysis pane */}
          <div className="border-t border-ink-700 bg-ink-900/60 p-5 md:border-l md:border-t-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-500">
                Clause analysis
              </span>
              <span className="text-[10px] text-counsel-500">Live ●</span>
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
          <span className="text-[13px] font-medium text-ink-100">{title}</span>
        </div>
        <Badge tone={risk}>
          {risk === "high" ? "High Risk" : risk === "med" ? "Review" : "Standard"}
        </Badge>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-300">{summary}</p>
      {streamingText && (
        <div className="mt-3 overflow-hidden border-l-2 border-counsel-500/50 pl-3 text-[11.5px] leading-relaxed text-ink-300">
          <span
            className="inline-block whitespace-nowrap"
            style={{
              animation: "stream-text 2.6s steps(40, end) 1 normal both",
            }}
          >
            {streamingText}
          </span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-md bg-counsel-500/10 px-2 py-0.5 font-mono text-[10px] text-counsel-200 ring-1 ring-inset ring-counsel-500/20">
          {citation}
        </span>
      </div>
    </div>
  );
}
