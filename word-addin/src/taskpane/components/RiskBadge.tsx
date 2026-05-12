import { cn } from "@addin/lib/cn";
import { RISK_BADGE } from "@addin/lib/constants";
import type { RiskLevel } from "@addin/types/contract";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const b = RISK_BADGE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
        b.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", b.dot)} />
      {b.label}
    </span>
  );
}
