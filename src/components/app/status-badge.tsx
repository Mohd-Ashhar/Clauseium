import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/contract";
import { statusConfig } from "@/lib/format";

export function StatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const cfg = statusConfig(status);
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        cfg.classes,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", cfg.spin && "animate-spin")} />
      {cfg.label}
    </span>
  );
}
