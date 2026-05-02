"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { cn } from "@/lib/utils";

interface Stage {
  label: string;
  meta: string;
  durationMs: number;
}

const stages: Stage[] = [
  { label: "Reading document", meta: "complete", durationMs: 800 },
  { label: "Identifying clauses", meta: "32 found", durationMs: 1200 },
  { label: "Cross-referencing playbook", meta: "in progress…", durationMs: 1800 },
  { label: "Drafting redlines", meta: "waiting", durationMs: 1000 },
];

export function ReviewLoading({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= stages.length) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), stages[step].durationMs);
    return () => clearTimeout(t);
  }, [step, onDone]);

  const total = stages.length;
  const progress = Math.min(step / total, 1);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-950"
    >
      <AuroraBackground intensity="dim" />
      <div className="relative z-10 bg-ink-900/80 backdrop-blur-md border border-ink-700 rounded-2xl px-8 py-7 max-w-md w-[90%] shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink-100">
          Analyzing your contract…
        </h2>
        <p className="text-[13px] text-ink-500 mt-1">
          Grounded in Indian law and your playbook.
        </p>

        <ul className="mt-6 space-y-3">
          {stages.map((s, i) => {
            const status: "complete" | "in_progress" | "waiting" =
              i < step ? "complete" : i === step ? "in_progress" : "waiting";
            return (
              <li key={s.label} className="flex items-center gap-3 text-[13.5px]">
                {status === "complete" ? (
                  <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
                ) : status === "in_progress" ? (
                  <Loader2 className="h-4 w-4 text-brand-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-ink-500 shrink-0" />
                )}
                <span
                  className={cn(
                    "flex-1 transition-colors",
                    status === "waiting" ? "text-ink-500" : "text-ink-200",
                  )}
                >
                  {s.label}
                </span>
                <span
                  className={cn(
                    "text-[12px] font-[family-name:var(--font-mono)]",
                    status === "complete" && "text-risk-low",
                    status === "in_progress" && "text-brand-400",
                    status === "waiting" && "text-ink-500",
                  )}
                >
                  {status === "complete" ? "complete" : status === "in_progress" ? "in progress…" : "waiting"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 space-y-1.5">
          <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="text-[11px] text-ink-500 font-[family-name:var(--font-mono)]">
            Stage {Math.min(step + 1, total)} of {total}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
