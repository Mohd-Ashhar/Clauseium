import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export function ActionBanner({
  count,
  estimatedMinutes,
  firstHref,
}: {
  count: number;
  estimatedMinutes: number;
  firstHref: string;
}) {
  if (count <= 0) return null;
  return (
    <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Zap className="h-4 w-4 text-brand-400 shrink-0" />
        <span className="text-sm font-medium text-ink-100">
          {count} {count === 1 ? "contract is" : "contracts are"} waiting for your review
        </span>
      </div>
      <div className="flex items-center gap-4 sm:justify-end">
        <Link
          href={firstHref}
          className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Start reviewing
          <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="text-[13px] text-ink-500 hidden sm:inline">
          Estimated time: ~{estimatedMinutes} min
        </span>
      </div>
    </div>
  );
}
