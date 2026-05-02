import { riskDistribution } from "@/lib/mock-data";

interface Segment {
  name: string;
  value: number;
  color: string;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const rad = ((angleInDegrees - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function DonutChart({ segments, size = 180 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const stroke = 18;

  let cursor = 0;
  return (
    <svg width={size} height={size} className="overflow-visible">
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-ink-700)"
        strokeWidth={stroke}
      />
      {segments.map((seg) => {
        const angle = (seg.value / total) * 360;
        // Leave a 2deg gap between segments
        const gap = 2;
        const start = cursor + gap / 2;
        const end = cursor + angle - gap / 2;
        cursor += angle;
        if (end - start <= 0) return null;
        return (
          <path
            key={seg.name}
            d={describeArc(cx, cy, r, start, end)}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        );
      })}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-ink-100 font-[family-name:var(--font-display)] font-bold"
        fontSize={26}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-ink-500"
        fontSize={11}
      >
        contracts
      </text>
    </svg>
  );
}

export function RiskDonut() {
  return (
    <div className="bg-ink-850 border border-ink-700 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold text-ink-100">Risk distribution</h3>
        <span className="text-xs text-ink-500">This month</span>
      </div>
      <div className="flex justify-center py-3">
        <DonutChart segments={riskDistribution} />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {riskDistribution.map((seg) => (
          <div key={seg.name} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-ink-300 flex-1">{seg.name}</span>
            <span className="text-ink-500 font-[family-name:var(--font-mono)]">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
