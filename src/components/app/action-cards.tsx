import Link from "next/link";
import { AlertTriangle, ArrowRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contract } from "@/types/contract";
import { topFlaggedClauses } from "@/lib/mock-data";

interface AttentionStats {
  needsAttention: number;
  highRisk: number;
  awaitingApproval: number;
}

export function AttentionCard({ stats }: { stats: AttentionStats }) {
  const { needsAttention, highRisk, awaitingApproval } = stats;
  const contextParts: string[] = [];
  if (highRisk > 0) contextParts.push(`${highRisk} with high-risk clauses`);
  if (awaitingApproval > 0) contextParts.push(`${awaitingApproval} awaiting approval`);
  const context = contextParts.join(" · ") || "All caught up";

  return (
    <div className="bg-ink-850 border border-ink-700 border-l-4 border-l-risk-med rounded-xl p-6 flex flex-col gap-3 md:col-span-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-risk-med font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Needs your attention
      </div>

      <div className="flex items-baseline gap-2 leading-none">
        <span className="font-[family-name:var(--font-display)] text-[48px] font-bold text-ink-100 tracking-tight">
          {needsAttention}
        </span>
        <span className="text-base text-ink-500">
          {needsAttention === 1 ? "contract" : "contracts"}
        </span>
      </div>

      <p className="text-[13px] text-ink-300">{context}</p>

      {needsAttention > 0 && (
        <Link
          href="#contract-queue"
          className="inline-flex items-center gap-1.5 self-start mt-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Review now
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

interface HighRiskStats {
  totalHighClauses: number;
  contractCount: number;
}

export function HighRiskCard({
  stats,
  contracts,
}: {
  stats: HighRiskStats;
  contracts: Contract[];
}) {
  // Build top 3 most-frequent high-risk clause categories from across our high-risk contracts.
  // For mock data, fall back to topFlaggedClauses since per-contract clause data isn't loaded.
  void contracts;
  const top = topFlaggedClauses.slice(0, 3);

  return (
    <div
      className={cn(
        "bg-ink-850 border border-ink-700 border-l-4 border-l-risk-high rounded-xl p-6 flex flex-col gap-3 md:col-span-2",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-risk-high font-medium">
        <Shield className="h-3.5 w-3.5" />
        High-risk clauses
      </div>

      <div className="flex items-baseline gap-2 leading-none">
        <span className="font-[family-name:var(--font-display)] text-[36px] font-bold text-ink-100 tracking-tight">
          {stats.totalHighClauses}
        </span>
        <span className="text-sm text-ink-500">flagged</span>
      </div>

      <p className="text-[13px] text-ink-300">
        across {stats.contractCount} {stats.contractCount === 1 ? "contract" : "contracts"}
      </p>

      <ul className="space-y-1 mt-1">
        {top.map((c) => (
          <li key={c.category} className="flex items-center gap-2 text-[13px] text-ink-300">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-high shrink-0" />
            <span className="flex-1 truncate">{c.label}</span>
            <span className="text-ink-500 font-[family-name:var(--font-mono)]">{c.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
