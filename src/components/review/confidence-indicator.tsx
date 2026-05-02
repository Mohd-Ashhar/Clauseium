import { cn } from "@/lib/utils";

type Tier = "high" | "medium" | "low";

function tierFromConfidence(c: number): Tier {
  if (c >= 85) return "high";
  if (c >= 60) return "medium";
  return "low";
}

const tierStyles: Record<Tier, { label: string; color: string; filled: number; bar: string }> = {
  high: { label: "High", color: "text-risk-low", filled: 8, bar: "bg-risk-low" },
  medium: { label: "Medium", color: "text-risk-med", filled: 6, bar: "bg-risk-med" },
  low: { label: "Low", color: "text-risk-high", filled: 3, bar: "bg-risk-high" },
};

export function ConfidenceIndicator({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const tier = tierFromConfidence(confidence);
  const { label, color, filled, bar } = tierStyles[tier];
  const tooltip = `Based on similar Indian commercial clauses and verified citations (${confidence}% confidence)`;
  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      title={tooltip}
    >
      <span className="text-[11px] uppercase tracking-wider text-ink-500">Confidence</span>
      <span className="inline-flex items-center gap-[2px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-[3px] rounded-[1px]",
              i < filled ? bar : "bg-ink-700",
            )}
          />
        ))}
      </span>
      <span className={cn("text-[12px] font-medium", color)}>{label}</span>
    </div>
  );
}
