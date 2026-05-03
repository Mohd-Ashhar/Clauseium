import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
};

export function FormField({ id, label, error, hint, children, className, trailing }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="text-[12px] text-risk-high" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
