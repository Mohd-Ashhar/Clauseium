import { FadeUp } from "@/components/motion/fade-up";

const logos = ["Razorpay", "Zerodha", "Swiggy", "CRED", "PhonePe", "Meesho"];

export function LogoCloud() {
  return (
    <section className="relative isolate bg-ink-950 py-16">
      <FadeUp>
        <div className="mx-auto max-w-[1240px] px-6">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">
            Trusted by India's best in-house teams
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 md:gap-x-16">
            {logos.map((name) => (
              <span
                key={name}
                className="font-display text-lg font-semibold tracking-tight text-ink-500/40 grayscale transition-all hover:text-ink-300/70 hover:grayscale-0"
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
