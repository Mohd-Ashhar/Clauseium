import Link from "next/link";
import { ArrowLeft, FileX } from "lucide-react";

export default function ContractNotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60vh] gap-4">
      <div className="h-16 w-16 rounded-full border border-dashed border-ink-700 flex items-center justify-center">
        <FileX className="h-7 w-7 text-ink-500" />
      </div>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-100">
          Contract not found
        </h1>
        <p className="text-sm text-ink-500 mt-1.5">
          We couldn&apos;t find this contract in your workspace.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
