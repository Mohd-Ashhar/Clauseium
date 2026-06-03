import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Single source of truth for surface/border/radius/padding so we stop re-typing
// "bg-ink-850 border border-ink-700 rounded-xl p-6" with divergent values.
const cardVariants = cva("rounded-xl border", {
  variants: {
    surface: {
      dark: "bg-ink-850 border-ink-700",
      darker: "bg-ink-900 border-ink-700",
      light: "bg-white border-paper-200",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: { surface: "dark", padding: "md" },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, surface, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ surface, padding }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { cardVariants };
