"use client";

import type { RiskLevel } from "@/types/contract";
import { useReview } from "./review-context";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  high: "bg-risk-high/15 border-b-2 border-risk-high/50 hover:bg-risk-high/25",
  medium: "bg-risk-med/10 border-b-2 border-risk-med/40 hover:bg-risk-med/20",
};

export function InlineHighlight({
  clauseId,
  riskLevel,
  children,
}: {
  clauseId: string;
  riskLevel: RiskLevel;
  children: React.ReactNode;
}) {
  const { setActiveClauseId } = useReview();
  const cls = styles[riskLevel];
  if (!cls) return <>{children}</>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setActiveClauseId(clauseId);
      }}
      className={cn("px-0.5 cursor-pointer transition-colors text-left", cls)}
    >
      {children}
    </button>
  );
}
