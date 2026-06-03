"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { Button } from "@/components/ui/button";

const AuroraBackground = dynamic(
  () => import("@/components/motion/aurora-background").then((m) => m.AuroraBackground),
  { ssr: false },
);

export function FinalCTA() {
  return (
    <section
      id="cta"
      className="relative isolate overflow-hidden bg-ink-950 py-24 md:py-32"
    >
      <div className="absolute inset-0 -z-10">
        <AuroraBackground intensity="dim" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <FadeUp>
          <h2
            className="font-display font-medium text-white"
            style={{
              fontSize: "clamp(2rem, 4vw + 0.5rem, 3rem)",
              lineHeight: 1.1,
            }}
          >
            Stop reading the same NDA twice.
            <br />
            <span className="italic text-counsel-300">Start closing.</span>
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-300">
            Join India's sharpest legal teams. Start reviewing contracts in 6
            minutes.
          </p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MagneticButton>
              <Button size="lg" variant="primary" asChild>
                <Link href="/signup">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </FadeUp>
        <FadeUp delay={0.3}>
          <p className="mt-7 font-mono text-[11.5px] tracking-wide text-ink-500">
            No credit card required · Free for 14 days · Cancel anytime
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
