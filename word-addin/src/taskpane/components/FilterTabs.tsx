import { cn } from "@addin/lib/cn";
import type { RiskLevel } from "@addin/types/contract";

export type FilterValue = "all" | RiskLevel;

interface FilterTabsProps {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

const TABS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Med" },
  { value: "standard", label: "OK" },
  { value: "missing", label: "Missing" },
];

export function FilterTabs({ value, onChange, counts }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter clauses by risk"
      className="flex items-center gap-1 px-3 py-2 border-b border-ink-800 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0",
              active
                ? "bg-ink-700/70 text-ink-100"
                : "text-ink-400 hover:text-ink-200 hover:bg-ink-800/60",
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "tabular-nums text-[10px]",
                active ? "text-ink-300" : "text-ink-500",
              )}
            >
              {counts[tab.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
