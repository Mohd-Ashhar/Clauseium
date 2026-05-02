"use client";

import { useMemo } from "react";
import { useReview } from "./review-context";
import { ReviewSummaryCard } from "./review-summary-card";
import { FilterBar } from "./filter-bar";
import { ClauseCard } from "./clause-card";
import { timeAgo } from "@/lib/format";

const riskRank: Record<string, number> = {
  high: 0,
  medium: 1,
  missing: 2,
  standard: 3,
  low: 3,
};

export function AnalysisPanel() {
  const { contract, filterLevel } = useReview();
  const allClauses = contract.clauses ?? [];

  const visibleClauses = useMemo(() => {
    let list = allClauses;
    if (filterLevel === "standard") {
      list = list.filter((c) => c.riskLevel === "standard" || c.riskLevel === "low");
    } else if (filterLevel !== "all") {
      list = list.filter((c) => c.riskLevel === filterLevel);
    }
    return [...list].sort((a, b) => {
      const r = (riskRank[a.riskLevel] ?? 4) - (riskRank[b.riskLevel] ?? 4);
      if (r !== 0) return r;
      return a.clauseNumber.localeCompare(b.clauseNumber, undefined, { numeric: true });
    });
  }, [allClauses, filterLevel]);

  return (
    <div className="h-full flex flex-col bg-ink-900 min-h-0">
      <header className="px-5 pt-5 pb-3 border-b border-ink-700 space-y-3 shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-100">AI Review</h2>
          <span className="text-[12px] text-ink-500 truncate">
            {allClauses.length} clauses · {contract.riskSummary.high} high risk · Updated{" "}
            {timeAgo(contract.lastUpdated)}
          </span>
        </div>
        <FilterBar />
      </header>

      <div className="flex-1 overflow-y-auto dark-scrollbar px-5 py-4">
        <ReviewSummaryCard />

        <div className="mt-4">
          {visibleClauses.length === 0 ? (
            <p className="text-center text-sm text-ink-500 py-8">
              No clauses match this filter.
            </p>
          ) : (
            visibleClauses.map((c) => <ClauseCard key={c.id} clause={c} />)
          )}
        </div>
      </div>
    </div>
  );
}
