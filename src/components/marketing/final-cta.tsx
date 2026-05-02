"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";
import { GradientText } from "@/components/motion/gradient-text";
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
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="mx-auto max-w-3xl px-6 text-center">
        <FadeUp>
          <h2
            className="font-display font-bold tracking-[-0.02em] text-white"
            style={{
              fontSize: "clamp(2rem, 4vw + 0.5rem, 3rem)",
              lineHeight: 1.05,
            }}
          >
            Stop reading the same NDA twice.
            <br />
            <GradientText>Start closing.</GradientText>
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
                <Link href="#">
                  Book a demo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <Button size="lg" variant="ghost" asChild>
              <Link href="#">Start 14-day free trial</Link>
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
