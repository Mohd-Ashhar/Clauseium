"use client";

import { cn } from "@/lib/utils";

type AuroraBackgroundProps = {
  className?: string;
  intensity?: "default" | "dim";
};

// Faint film grain — keeps deep-ink surfaces from looking flat without the
// "AI startup" aurora. Static (no animation), so it respects reduced-motion.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Refined backdrop for dark hero surfaces. Replaces the multi-colour aurora
 * with a restrained deep-ink wash + a single quiet counsel-gold pool and faint
 * grain — the premium legaltech atmosphere (Harvey / Spellbook), not dev-tool.
 */
export function AuroraBackground({
  className,
  intensity = "default",
}: AuroraBackgroundProps) {
  const glow = intensity === "dim" ? 0.05 : 0.09;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Deep vertical ink wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #07080a 0%, #050505 55%, #030303 100%)",
        }}
      />
      {/* Single quiet warm pool, low and centred — a hint of counsel-gold */}
      <div
        className="absolute left-1/2 top-[-10%] h-[640px] w-[900px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201,164,73,1) 0%, transparent 70%)",
          filter: "blur(120px)",
          opacity: glow,
        }}
      />
      {/* Faint grain */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{ backgroundImage: GRAIN, opacity: 0.18 }}
      />
    </div>
  );
}

export default AuroraBackground;
