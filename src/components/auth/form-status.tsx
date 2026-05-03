import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FormStatusProps = {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
};

export function FormStatus({ tone, children, className }: FormStatusProps) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed",
        tone === "error"
          ? "border-risk-high/30 bg-risk-high/10 text-risk-high"
          : "border-risk-low/30 bg-risk-low/10 text-risk-low",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
