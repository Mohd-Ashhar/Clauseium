import Link from "next/link";
import { AlertTriangle, ArrowRight, Shield } from "lucide-react";

interface AttentionStats {
  needsAttention: number;
  highRisk: number;
}

export function AttentionCard({ stats }: { stats: AttentionStats }) {
  const { needsAttention, highRisk } = stats;
  const context =
    highRisk > 0
      ? `${highRisk} ${highRisk === 1 ? "contract has" : "contracts have"} high-risk clauses`
      : needsAttention > 0
        ? "Awaiting your review"
        : "All caught up";

  return (
    <div className="bg-ink-850 border border-ink-700 border-l-4 border-l-risk-med rounded-xl p-6 flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-risk-med font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Needs your attention
      </div>

      <div className="flex items-baseline gap-2 leading-none">
        <span className="font-[family-name:var(--font-display)] text-[44px] font-semibold text-ink-100 tracking-tight">
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
          className="inline-flex items-center gap-1.5 self-start mt-1 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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

export function HighRiskCard({ stats }: { stats: HighRiskStats }) {
  return (
    <div className="bg-ink-850 border border-ink-700 border-l-4 border-l-risk-high rounded-xl p-6 flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-risk-high font-medium">
        <Shield className="h-3.5 w-3.5" />
        High-risk clauses
      </div>

      <div className="flex items-baseline gap-2 leading-none">
        <span className="font-[family-name:var(--font-display)] text-[36px] font-semibold text-ink-100 tracking-tight">
          {stats.totalHighClauses}
        </span>
        <span className="text-sm text-ink-500">flagged</span>
      </div>

      <p className="text-[13px] text-ink-300">
        across {stats.contractCount} {stats.contractCount === 1 ? "contract" : "contracts"}
      </p>
    </div>
  );
}
