"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";
import { GradientText } from "@/components/motion/gradient-text";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { Button } from "@/components/ui/button";
import { HeroProductPreview } from "./hero-product-preview";

const AuroraBackground = dynamic(
  () => import("@/components/motion/aurora-background").then((m) => m.AuroraBackground),
  { ssr: false },
);

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 pt-28 md:pt-32">
      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Aurora */}
      <div className="absolute inset-0 -z-10">
        <AuroraBackground />
      </div>
      {/* Vignette to darken edges */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 0%, rgba(5,5,5,0.6) 100%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-6 text-center">
        <FadeUp delay={0}>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Now in private beta · Trained on Indian commercial law
          </span>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1
            className="mt-8 font-display font-bold tracking-[-0.03em] text-white"
            style={{
              fontSize: "clamp(2.4rem, 6vw + 1rem, 5.5rem)",
              lineHeight: 1.02,
            }}
          >
            <GradientText className="from-white via-brand-200 to-counsel-200">
              India&apos;s AI Contract
            </GradientText>
            <br />
            Review Platform.
          </h1>
        </FadeUp>

        <FadeUp delay={0.15}>
          <h2 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(1.15rem,1.4vw+0.5rem,1.55rem)] font-semibold leading-snug tracking-tight text-white/90">
            Review contracts in 6 minutes, not 6 hours — grounded in the
            Indian Contract Act, DPDP, and your own playbook.
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-300 md:text-lg">
            Upload a vendor MSA. Get a redlined Word doc in 6 minutes — every
            clause checked, every risk flagged, every citation verified
            against Indian Kanoon and India Code.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MagneticButton>
              <Button size="lg" variant="primary" asChild>
                <Link href="#cta">
                  Book a 20-min demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <Button size="lg" variant="ghost" asChild>
              <Link href="#showcase">
                <Play className="h-4 w-4" />
                Watch 90-sec tour
              </Link>
            </Button>
          </div>
        </FadeUp>

        <FadeUp delay={0.4}>
          <p className="mt-8 font-mono text-[12px] tracking-wide text-ink-500">
            SOC 2 Type II · ISO 27001 · DPDP-ready · Zero data retention
          </p>
        </FadeUp>
      </div>

      <FadeUp delay={0.5} className="mx-auto mt-14 max-w-6xl px-4 md:mt-20 md:px-6">
        <HeroProductPreview />
      </FadeUp>

      {/* bottom spacer for visual balance into transition */}
      <div className="h-24 md:h-32" />
    </section>
  );
}
