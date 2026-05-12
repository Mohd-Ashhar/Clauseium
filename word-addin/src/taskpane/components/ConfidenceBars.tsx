import { cn } from "@addin/lib/cn";

// 8-bar visual indicator. Fill proportional to confidence in [0, 1].
// Per /CLAUDE.md the design system disallows raw % everywhere except this
// AI confidence display, where bars are paired with the % to give shape
// AND magnitude.

export function ConfidenceBars({ confidence }: { confidence: number }) {
  const filled = Math.max(0, Math.min(8, Math.round(confidence * 8)));
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-[3px] rounded-[1px]",
            i < filled ? "bg-risk-low" : "bg-ink-700",
          )}
        />
      ))}
    </div>
  );
}
