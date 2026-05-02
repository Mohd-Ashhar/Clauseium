import { AlertCircle, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/contract";

const riskMap = {
  high: {
    icon: Shield,
    classes: "bg-risk-high/15 text-risk-high",
    label: "High",
  },
  medium: {
    icon: AlertTriangle,
    classes: "bg-risk-med/15 text-risk-med",
    label: "Medium",
  },
  low: {
    icon: CheckCircle2,
    classes: "bg-risk-low/15 text-risk-low",
    label: "Low",
  },
  standard: {
    icon: CheckCircle2,
    classes: "bg-risk-low/15 text-risk-low",
    label: "Standard",
  },
  missing: {
    icon: AlertCircle,
    classes: "bg-risk-info/15 text-risk-info",
    label: "Missing",
  },
} as const;

export function RiskBadge({
  level,
  count,
  className,
}: {
  level: RiskLevel;
  count?: number;
  className?: string;
}) {
  const { icon: Icon, classes, label } = riskMap[level];
  const text =
    count !== undefined
      ? `${count} ${level === "high" ? "High" : level === "medium" ? "Med" : label}`
      : label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        classes,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}
