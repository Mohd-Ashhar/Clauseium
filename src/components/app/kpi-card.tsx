import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 84;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function MiniDonut({ percent, color }: { percent: number; color: string }) {
  const size = 36;
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-ink-700)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; direction: "up" | "down"; sentiment: "good" | "bad"; suffix?: string };
  period?: string;
  sparkline?: { data: number[]; color: string };
  donut?: { percent: number; color: string };
}

export function KPICard({ label, value, unit, trend, period, sparkline, donut }: KPICardProps) {
  let trendBadge: React.ReactNode = null;
  if (trend) {
    const TrendIcon: LucideIcon = trend.direction === "up" ? TrendingUp : TrendingDown;
    const tone =
      trend.sentiment === "good"
        ? "bg-risk-low/15 text-risk-low"
        : "bg-risk-high/15 text-risk-high";
    trendBadge = (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
          tone,
        )}
      >
        <TrendIcon className="h-3 w-3" />
        {trend.value}%{trend.suffix ? ` ${trend.suffix}` : ""}
      </span>
    );
  } else if (period) {
    trendBadge = <span className="text-[11px] text-ink-500">{period}</span>;
  }

  return (
    <div className="bg-ink-850 border border-ink-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-ink-500 font-medium">
          {label}
        </span>
        {trendBadge}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-display)] text-[32px] leading-none font-bold text-ink-100 tracking-tight">
            {value}
          </span>
          {unit && <span className="text-sm text-ink-500">{unit}</span>}
        </div>

        {sparkline && <Sparkline data={sparkline.data} color={sparkline.color} />}
        {donut && (
          <div className="relative">
            <MiniDonut percent={donut.percent} color={donut.color} />
          </div>
        )}
      </div>
    </div>
  );
}
