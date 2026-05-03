import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <div className={cn("w-full max-w-[420px]", className)}>
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-tight text-ink-100">
          {title}
        </h1>
        {description ? (
          <p className="text-[14px] text-ink-400 leading-relaxed">{description}</p>
        ) : null}
      </div>
      <div className="mt-7">{children}</div>
      {footer ? (
        <div className="mt-6 text-center text-[13px] text-ink-400">{footer}</div>
      ) : null}
    </div>
  );
}
