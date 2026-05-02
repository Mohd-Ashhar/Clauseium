"use client";

import { useReview } from "./review-context";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/contract";

export function FilterBar() {
  const { contract, filterLevel, setFilterLevel } = useReview();
  const clauses = contract.clauses ?? [];

  const counts = {
    all: clauses.length,
    high: clauses.filter((c) => c.riskLevel === "high").length,
    medium: clauses.filter((c) => c.riskLevel === "medium").length,
    standard: clauses.filter((c) => c.riskLevel === "standard" || c.riskLevel === "low").length,
    missing: clauses.filter((c) => c.riskLevel === "missing").length,
  };

  const filters: { id: RiskLevel | "all"; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "high", label: "High", count: counts.high },
    { id: "medium", label: "Medium", count: counts.medium },
    { id: "standard", label: "Standard", count: counts.standard },
    { id: "missing", label: "Missing", count: counts.missing },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto dark-scrollbar -mx-1 px-1">
      {filters.map((f) => {
        if (f.id !== "all" && f.count === 0) return null;
        const active = filterLevel === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setFilterLevel(f.id)}
            className={cn(
              "text-xs px-3 py-1 rounded-full transition-colors whitespace-nowrap",
              active
                ? "bg-brand-500/15 text-brand-200"
                : "bg-ink-850 text-ink-500 hover:text-ink-300",
            )}
          >
            {f.label} ({f.count})
          </button>
        );
      })}
    </div>
  );
}
