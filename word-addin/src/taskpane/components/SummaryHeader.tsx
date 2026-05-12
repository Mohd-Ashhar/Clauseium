import { LogOut } from "lucide-react";
import type { AnalysisSummary } from "@addin/types/contract";

interface SummaryHeaderProps {
  title: string;
  summary: AnalysisSummary | null;
  onSignOut: () => void;
}

export function SummaryHeader({ title, summary, onSignOut }: SummaryHeaderProps) {
  return (
    <header className="px-3 py-3 border-b border-ink-800 bg-ink-900/60 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-brand-400 font-[family-name:var(--font-display)] font-bold">
              §
            </span>
            <span className="text-[12px] font-medium tracking-wide text-ink-300">
              Clauseium
            </span>
          </div>
          <h1 className="text-[14px] font-semibold text-ink-100 truncate">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="text-ink-500 hover:text-ink-200 p-1 rounded-md transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>

      {summary && (
        <div className="mt-2.5 flex items-center gap-3 text-[11px]">
          <SummaryStat label="High" count={summary.by_risk.high} tone="text-risk-high" />
          <SummaryStat label="Med" count={summary.by_risk.medium} tone="text-risk-med" />
          <SummaryStat
            label="OK"
            count={summary.by_risk.low + summary.by_risk.standard}
            tone="text-risk-low"
          />
          {summary.by_risk.missing > 0 && (
            <SummaryStat
              label="Missing"
              count={summary.by_risk.missing}
              tone="text-risk-info"
            />
          )}
        </div>
      )}
    </header>
  );
}

function SummaryStat({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={`font-semibold tabular-nums ${tone}`}>{count}</span>
      <span className="text-ink-500 uppercase tracking-wider text-[10px]">
        {label}
      </span>
    </div>
  );
}
