import { FadeUp } from "@/components/motion/fade-up";

// Honest trust signal during private beta: lead on defensible capability —
// the Indian statutes Clauseium is grounded in — not unpermissioned customer logos.
const statutes = [
  "Indian Contract Act 1872",
  "IT Act 2000",
  "DPDP Act 2023",
  "Companies Act 2013",
  "FEMA 1999",
  "Arbitration Act 1996",
  "Indian Stamp Act 1899",
];

export function LogoCloud() {
  return (
    <section className="relative isolate bg-ink-950 py-16">
      <FadeUp>
        <div className="mx-auto max-w-[1240px] px-6">
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-ink-500">
            Grounded in the Indian statutes that matter
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-12">
            {statutes.map((name) => (
              <span
                key={name}
                className="font-display text-[15px] font-medium tracking-tight text-ink-400 transition-colors hover:text-ink-200"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
