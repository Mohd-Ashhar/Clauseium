"use client";

import { Download, Zap } from "lucide-react";
import { useReview } from "./review-context";
import { cn } from "@/lib/utils";

export function ReviewSummaryCard() {
  const { contract, setExportOpen, toast, clauseStates, setClauseState } = useReview();
  const r = contract.riskSummary;
  const score = r.overallScore;

  const scoreColor =
    score < 40 ? "bg-risk-high" : score < 70 ? "bg-risk-med" : "bg-risk-low";

  const acceptAllStandard = () => {
    if (!contract.clauses) return;
    let count = 0;
    contract.clauses.forEach((c) => {
      if (
        (c.riskLevel === "standard" || c.riskLevel === "low") &&
        clauseStates[c.id] !== "accepted"
      ) {
        setClauseState(c.id, "accepted");
        count++;
      }
    });
    toast(`Accepted ${count} standard clause${count === 1 ? "" : "s"}`, "success");
  };

  return (
    <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-brand-300 font-medium">
          Review Summary
        </span>
        <span className="text-[11px] text-ink-500">v{contract.version}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {r.high > 0 && <Pill tone="high">{r.high} High</Pill>}
        {r.medium > 0 && <Pill tone="med">{r.medium} Medium</Pill>}
        {(r.low + r.standard) > 0 && (
          <Pill tone="low">{r.low + r.standard} Standard</Pill>
        )}
        {r.missing > 0 && <Pill tone="info">{r.missing} Missing</Pill>}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[13px] text-ink-300">Overall risk score</span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink-100">
            {score}
            <span className="text-ink-500 text-sm">/100</span>
          </span>
        </div>
        <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", scoreColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {r.escalationRecommended && (
        <div className="flex items-start gap-2.5 bg-risk-med/8 border border-risk-med/20 rounded-lg p-3">
          <Zap className="h-4 w-4 text-risk-med shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-risk-med">
              Recommendation: Escalate to senior counsel
            </p>
            {r.escalationReason && (
              <p className="text-[12.5px] text-ink-300 mt-1 leading-relaxed">
                {r.escalationReason}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={acceptAllStandard}
          className="inline-flex items-center gap-1.5 bg-risk-low/10 hover:bg-risk-low/20 text-risk-low text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Accept all standard ✓
        </button>
        <button
          onClick={() => setExportOpen(true)}
          className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-[13px] px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export summary
        </button>
      </div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "high" | "med" | "low" | "info";
  children: React.ReactNode;
}) {
  const map = {
    high: "bg-risk-high/15 text-risk-high",
    med: "bg-risk-med/15 text-risk-med",
    low: "bg-risk-low/15 text-risk-low",
    info: "bg-risk-info/15 text-risk-info",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}
