"use client";

import type { RiskLevel } from "@/types/contract";
import { useReview } from "./review-context";
import { cn } from "@/lib/utils";

const colorMap: Record<RiskLevel, string> = {
  high: "bg-risk-high",
  medium: "bg-risk-med",
  low: "bg-risk-low",
  standard: "bg-risk-low",
  missing: "bg-risk-info",
};

export function ClauseGutter({
  clauseId,
  riskLevel,
}: {
  clauseId: string;
  riskLevel: RiskLevel;
}) {
  const { activeClauseId, setActiveClauseId } = useReview();
  const active = activeClauseId === clauseId;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setActiveClauseId(clauseId);
      }}
      className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-full transition-all hover:w-1.5",
        colorMap[riskLevel],
        active && "w-1.5 ring-2 ring-brand-500/40",
      )}
      aria-label={`View analysis for clause`}
      title="View analysis"
    />
  );
}
