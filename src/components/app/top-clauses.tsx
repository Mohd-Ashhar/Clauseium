import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { topFlaggedClauses } from "@/lib/mock-data";

const trendIcon = {
  up: { Icon: TrendingUp, className: "text-risk-high" },
  down: { Icon: TrendingDown, className: "text-risk-low" },
  stable: { Icon: Minus, className: "text-ink-500" },
} as const;

export function TopClauses() {
  const max = Math.max(...topFlaggedClauses.map((c) => c.count));

  return (
    <div className="bg-ink-850 border border-ink-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-ink-100 mb-4">Top flagged clauses</h3>
      <div className="space-y-3">
        {topFlaggedClauses.map((clause) => {
          const { Icon, className } = trendIcon[clause.trend];
          const widthPct = (clause.count / max) * 100;
          return (
            <div key={clause.category} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-ink-300 truncate">{clause.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] font-[family-name:var(--font-mono)] text-ink-100">
                    {clause.count}
                  </span>
                  <Icon className={`h-3 w-3 ${className}`} />
                </div>
              </div>
              <div className="h-[2px] w-full bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500/40 rounded-full"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
