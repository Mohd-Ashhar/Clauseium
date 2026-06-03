import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "high" | "med" | "low" | "info";

const toneText: Record<Tone, string> = {
  neutral: "text-ink-400",
  high: "text-risk-high",
  med: "text-risk-med",
  low: "text-risk-low",
  info: "text-risk-info",
};

const toneBorder: Record<Tone, string> = {
  neutral: "border-l-ink-600",
  high: "border-l-risk-high",
  med: "border-l-risk-med",
  low: "border-l-risk-low",
  info: "border-l-risk-info",
};

type KPIStatProps = {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
};

// Dashboard KPI: eyebrow label + serif value + caption. Serif at font-semibold
// (not the old faux-bold 48px) so it reads premium, not heavy.
export function KPIStat({
  label,
  value,
  caption,
  unit,
  icon: Icon,
  tone = "neutral",
  className,
}: KPIStatProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-ink-700 border-l-4 bg-ink-850 p-6",
        toneBorder[tone],
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]",
          toneText[tone],
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="flex items-baseline gap-2 leading-none">
        <span className="font-display text-[40px] font-semibold tracking-tight text-ink-100">
          {value}
        </span>
        {unit && <span className="text-base text-ink-500">{unit}</span>}
      </div>
      {caption && <p className="text-[13px] text-ink-300">{caption}</p>}
    </div>
  );
}
