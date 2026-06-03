import type { ReactNode } from "react";
import { FadeUp } from "@/components/motion/fade-up";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

type Testimonial = {
  quote: ReactNode;
  name: string;
  title: string;
  initials: string;
  accent: "brand" | "counsel" | "low";
};

// Anonymized feedback from private-beta design partners. Names/initials are
// withheld until we have permission to attribute — no fabricated identities.
const items: Testimonial[] = [
  {
    quote: (
      <>
        Clauseium{" "}
        <span className="font-medium text-counsel-600">
          caught a missing DPDP consent clause
        </span>{" "}
        in a vendor MSA that our external counsel missed. The citation to
        Section 8(1) was spot on.
      </>
    ),
    name: "General Counsel",
    title: "Series D fintech · name withheld during beta",
    initials: "GC",
    accent: "counsel",
  },
  {
    quote: (
      <>
        We went from{" "}
        <span className="font-medium text-counsel-600">
          3-day contract turnaround to same-day
        </span>
        . The redlines come pre-drafted with Indian law citations — my team
        just reviews and sends.
      </>
    ),
    name: "VP, Legal",
    title: "Enterprise SaaS · name withheld during beta",
    initials: "VP",
    accent: "counsel",
  },
  {
    quote: (
      <>
        Finally a tool that knows the difference between Indian arbitration law
        and international norms. The{" "}
        <span className="font-medium text-counsel-600">
          SIAC vs. domestic arbitration flagging
        </span>{" "}
        alone is genuinely useful.
      </>
    ),
    name: "Head of Legal",
    title: "E-commerce · name withheld during beta",
    initials: "HL",
    accent: "low",
  },
];

const accentMap = {
  brand: "border-t-counsel-500",
  counsel: "border-t-counsel-500",
  low: "border-t-risk-low",
} as const;

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="bg-paper-50 py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-counsel-600">
            From our private beta
          </p>
          <h2 className="mt-3 text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            What early counsel are telling us
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[13px] leading-relaxed text-paper-900/55">
            Anonymized feedback from design-partner legal teams in our private
            beta. Named references available under NDA.
          </p>
        </FadeUp>

        <Stagger className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t) => (
            <StaggerItem key={t.name}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border border-paper-200 border-t-2 bg-white p-7 transition-all duration-300 hover:border-counsel-500/20 hover:shadow-[0_4px_20px_rgba(201,164,73,0.06)] ${accentMap[t.accent]}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-2 select-none font-display text-[64px] leading-none text-counsel-500/15"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  &ldquo;
                </span>

                <p className="relative mt-6 text-[15px] leading-relaxed text-paper-900">
                  {t.quote}
                </p>

                <div className="mt-auto flex items-center gap-3 border-t border-paper-200 pt-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-counsel-500/10 font-display text-[14px] font-semibold text-counsel-600">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-paper-900">
                      {t.name}
                    </div>
                    <div className="text-[12.5px] text-paper-900/50">
                      {t.title}
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
