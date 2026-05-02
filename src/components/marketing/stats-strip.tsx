"use client";

import { CountUp } from "@/components/motion/count-up";
import { FadeUp } from "@/components/motion/fade-up";

const stats: {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
  format?: (n: number) => string;
}[] = [
  {
    value: 10000,
    suffix: "+",
    label: "Contracts reviewed",
    format: (n) => Math.round(n).toLocaleString("en-IN"),
  },
  { value: 94, suffix: "%", label: "Citation accuracy" },
  { value: 6, suffix: " min", label: "Average review time" },
  {
    value: 2.4,
    prefix: "₹",
    suffix: "Cr",
    label: "Risk exposure caught",
    format: (n) => n.toFixed(1),
  },
];

export function StatsStrip() {
  return (
    <section className="bg-paper-100 py-16 md:py-20">
      <FadeUp>
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-y-12 px-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-[clamp(2.5rem,4vw+0.5rem,3.5rem)] font-extrabold tracking-tight text-paper-900">
                {s.prefix && <span>{s.prefix}</span>}
                <CountUp
                  to={s.value}
                  format={s.format}
                  className="tabular-nums"
                />
                <span className="text-brand-500">{s.suffix}</span>
              </div>
              <div className="mt-1 text-[13.5px] text-paper-900/50">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  );
}
