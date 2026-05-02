import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-[0_0_0_1px_rgba(124,92,255,0.25),0_8px_40px_rgba(124,92,255,0.35)]",
        ghost:
          "border border-ink-700 bg-transparent text-ink-300 hover:border-ink-500 hover:text-white",
        ghostLight:
          "border border-paper-200 bg-white text-paper-900 hover:border-paper-900/30 hover:bg-paper-50",
        outline:
          "border border-paper-200 bg-transparent text-paper-900 hover:bg-paper-100",
        link: "text-brand-500 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
