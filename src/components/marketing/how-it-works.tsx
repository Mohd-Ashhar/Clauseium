import { FadeUp } from "@/components/motion/fade-up";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

const steps = [
  {
    n: "01",
    title: "Drop your contract",
    body: "Drop a vendor MSA, NDA, or employment agreement. PDF, DOCX, or paste text directly.",
  },
  {
    n: "02",
    title: "AI finds every risk in 6 minutes",
    body: "Clauseium reads every clause, flags risks, and drafts redlines citing the Indian Contract Act, DPDP, and your standards.",
  },
  {
    n: "03",
    title: "One click. Done.",
    body: "Accept or modify each redline. Export a clean redlined Word doc ready for the counterparty.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-paper-50 py-24 md:py-28">
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-brand-600">
            Workflow
          </p>
          <h2 className="mt-3 text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            Three steps. Six minutes.
          </h2>
        </FadeUp>

        <Stagger className="mt-16 flex flex-col items-stretch gap-10 md:flex-row md:gap-6">
          {steps.map((s, i) => (
            <StaggerItem key={s.n} className="flex-1">
              <div className="relative flex flex-col items-start">
                <div className="flex items-center gap-4 self-stretch">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-paper-50 font-mono text-[13px] font-semibold text-brand-500">
                    {s.n}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden h-0 flex-1 border-t-2 border-dashed border-paper-200 md:block"
                    />
                  )}
                </div>
                <h3 className="mt-5 font-display text-[18px] font-semibold tracking-tight text-paper-900">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-paper-900/60">
                  {s.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
