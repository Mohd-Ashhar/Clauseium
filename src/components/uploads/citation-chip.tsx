import { AlertTriangle, BookOpen, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// "retrieved" = pulled from the corpus search but NOT verification-checked (chat
// path). The green check is reserved for "verified" only — never imply a check
// we didn't perform.
export type CitationChipStatus =
  | "verified"
  | "partially_verified"
  | "unverified"
  | "retrieved";

const CONFIG: Record<
  CitationChipStatus,
  { tone: string; label: string; Icon: typeof CheckCircle2; title: string }
> = {
  verified: {
    tone: "bg-risk-low/10 text-risk-low border-risk-low/30",
    label: "verified",
    Icon: CheckCircle2,
    title: "Verified against Clauseium's Indian-law corpus",
  },
  partially_verified: {
    tone: "bg-risk-med/10 text-risk-med border-risk-med/30",
    label: "partial",
    Icon: AlertTriangle,
    title: "Partially matched in our corpus — confirm before relying",
  },
  unverified: {
    tone: "bg-risk-high/10 text-risk-high border-risk-high/30",
    label: "unverified",
    Icon: ShieldAlert,
    title: "Could not verify against our corpus — do not rely without checking",
  },
  retrieved: {
    tone: "bg-ink-800 text-ink-400 border-ink-700",
    label: "from corpus",
    Icon: BookOpen,
    title: "Retrieved from the Indian-law corpus — not verification-checked",
  },
};

export function CitationChip({
  status,
  className,
  withLabel = true,
}: {
  status: CitationChipStatus;
  className?: string;
  withLabel?: boolean;
}) {
  const { tone, label, Icon, title } = CONFIG[status];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {withLabel && <span className="uppercase tracking-wide">{label}</span>}
    </span>
  );
}
