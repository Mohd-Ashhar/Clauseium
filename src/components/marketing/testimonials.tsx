import { FadeUp } from "@/components/motion/fade-up";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

type Testimonial = {
  quote: string;
  name: string;
  title: string;
  initials: string;
  color: string;
};

const items: Testimonial[] = [
  {
    quote:
      "Clauseium caught a missing DPDP consent clause in a vendor MSA that our external counsel missed. The citation to Section 8(1) was spot on.",
    name: "Priya Menon",
    title: "General Counsel · Series D Fintech",
    initials: "PM",
    color: "bg-[#7c5cff]",
  },
  {
    quote:
      "We went from 3-day contract turnaround to same-day. The redlines come pre-drafted with Indian law citations — my team just reviews and sends.",
    name: "Arjun Subramanian",
    title: "VP Legal · Enterprise SaaS",
    initials: "AS",
    color: "bg-[#1e40af]",
  },
  {
    quote:
      "Finally a tool that knows the difference between Indian arbitration law and international norms. The SIAC vs. domestic flagging alone is worth the subscription.",
    name: "Nidhi Kapoor",
    title: "Head of Legal · E-commerce Unicorn",
    initials: "NK",
    color: "bg-[#c9a449]",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="bg-paper-50 py-24 md:py-28"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-brand-600">
            Voices from India's GCs
          </p>
          <h2 className="mt-3 text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            What India's GCs are saying
          </h2>
        </FadeUp>

        <Stagger className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t) => (
            <StaggerItem key={t.name}>
              <div className="flex h-full flex-col rounded-2xl border border-paper-200 bg-white p-7 transition-colors hover:border-brand-500/20">
                <div className="font-display text-[48px] leading-none text-brand-500/20">
                  &ldquo;
                </div>
                <p className="mt-2 text-[15px] italic leading-relaxed text-paper-900">
                  {t.quote}
                </p>
                <div className="mt-auto flex items-center gap-3 border-t border-paper-200 pt-6">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-[14px] font-semibold text-white ${t.color}`}
                  >
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
