import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type GradientTextProps = {
  children: ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
};

export function GradientText({
  children,
  className,
  from = "from-white",
  via = "via-counsel-200",
  to = "to-counsel-200",
}: GradientTextProps) {
  return (
    <span
      className={cn(
        "bg-gradient-to-br bg-clip-text text-transparent",
        from,
        via,
        to,
        className,
      )}
    >
      {children}
    </span>
  );
}
