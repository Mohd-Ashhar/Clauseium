"use client";

import { cn } from "@/lib/utils";

type AuroraBackgroundProps = {
  className?: string;
  intensity?: "default" | "dim";
};

export function AuroraBackground({
  className,
  intensity = "default",
}: AuroraBackgroundProps) {
  const baseOpacity = intensity === "dim" ? 0.22 : 0.4;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute left-[5%] top-[10%] h-[520px] w-[520px] rounded-full"
        style={{
          background: "#7c5cff",
          filter: "blur(120px)",
          opacity: baseOpacity,
          willChange: "transform",
          animation: "aurora-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-[8%] top-[20%] h-[460px] w-[460px] rounded-full"
        style={{
          background: "#4cc2ff",
          filter: "blur(140px)",
          opacity: baseOpacity * 0.85,
          willChange: "transform",
          animation: "aurora-2 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[5%] left-[15%] h-[420px] w-[420px] rounded-full"
        style={{
          background: "#e040a0",
          filter: "blur(140px)",
          opacity: baseOpacity * 0.7,
          willChange: "transform",
          animation: "aurora-3 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[10%] right-[10%] h-[560px] w-[560px] rounded-full"
        style={{
          background: "#1e40af",
          filter: "blur(150px)",
          opacity: baseOpacity * 0.8,
          willChange: "transform",
          animation: "aurora-4 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export default AuroraBackground;
