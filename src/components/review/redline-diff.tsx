import { ArrowDown } from "lucide-react";

export function RedlineDiff({
  original,
  suggested,
}: {
  original: string;
  suggested: string;
}) {
  return (
    <div className="space-y-2">
      <div className="bg-risk-high/8 border border-risk-high/20 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-risk-high/80 mb-1.5 font-medium">
          Original
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-risk-high/85 line-through decoration-risk-high/40">
          {original}
        </p>
      </div>
      <div className="flex justify-center">
        <ArrowDown className="h-4 w-4 text-ink-500" />
      </div>
      <div className="bg-risk-low/8 border border-risk-low/20 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-risk-low/90 mb-1.5 font-medium">
          Suggested
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-risk-low/90">
          {suggested}
        </p>
      </div>
    </div>
  );
}
