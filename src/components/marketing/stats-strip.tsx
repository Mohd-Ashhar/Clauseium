"use client";

import { CountUp } from "@/components/motion/count-up";
import { FadeUp } from "@/components/motion/fade-up";

const stats: {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
  caption: string;
  format?: (n: number) => string;
}[] = [
  // Honest, methodology-backed capability facts — no fabricated usage metrics
  // while in private beta.
  {
    value: 7,
    suffix: "",
    label: "Core Indian statutes",
    caption: "Contract Act, IT Act, DPDP, Companies Act, FEMA & more",
  },
  {
    value: 94,
    suffix: "%",
    label: "Citation accuracy",
    caption: "on our 50-contract evaluation set",
  },
  {
    value: 6,
    suffix: " min",
    label: "Upload to redline",
    caption: "median in internal benchmarks",
  },
  {
    value: 30,
    suffix: "-day",
    label: "Max data retention",
    caption: "auto-deleted unless you opt in (DPDP)",
  },
];

export function StatsStrip() {
  return (
    <section className="bg-paper-100 py-16 md:py-20">
      <FadeUp>
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-x-6 gap-y-10 px-6 md:grid-cols-4 md:gap-y-0">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-[clamp(2.5rem,4vw+0.5rem,3.5rem)] font-extrabold tracking-tight text-paper-900">
                {s.prefix && <span>{s.prefix}</span>}
                <CountUp
                  to={s.value}
                  format={s.format}
                  className="tabular-nums"
                />
                <span className="text-counsel-500">{s.suffix}</span>
              </div>
              <div className="mt-1 text-[13.5px] font-medium text-paper-900/70">
                {s.label}
              </div>
              <div className="mt-0.5 text-balance text-[11px] text-paper-900/40">
                {s.caption}
              </div>
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  );
}
