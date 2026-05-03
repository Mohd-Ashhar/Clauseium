import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 text-sm text-ink-100 placeholder:text-ink-500 transition-colors",
        "focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-risk-high aria-[invalid=true]:focus-visible:ring-risk-high/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
