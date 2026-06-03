import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export function ActionBanner({
  count,
  firstHref,
}: {
  count: number;
  firstHref: string;
}) {
  if (count <= 0) return null;
  return (
    <div className="bg-counsel-500/5 border border-counsel-500/20 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Zap className="h-4 w-4 text-counsel-400 shrink-0" />
        <span className="text-sm font-medium text-ink-100">
          {count} {count === 1 ? "contract is" : "contracts are"} waiting for your review
        </span>
      </div>
      <Link
        href={firstHref}
        className="inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
      >
        Start reviewing
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
