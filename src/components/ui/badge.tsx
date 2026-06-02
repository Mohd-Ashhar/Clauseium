import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      tone: {
        brand: "border-counsel-500/30 bg-counsel-500/10 text-counsel-200",
        counsel: "border-counsel-500/30 bg-counsel-500/10 text-counsel-200",
        high: "border-risk-high/30 bg-risk-high/10 text-risk-high",
        med: "border-risk-med/30 bg-risk-med/10 text-risk-med",
        low: "border-risk-low/30 bg-risk-low/10 text-risk-low",
        muted: "border-paper-200 bg-paper-100 text-paper-900/70",
        outline: "border-ink-700 bg-transparent text-ink-300",
      },
    },
    defaultVariants: { tone: "brand" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
