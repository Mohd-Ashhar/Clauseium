"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ContractError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-700 bg-ink-850">
        <AlertTriangle className="h-6 w-6 text-risk-med" />
      </div>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-medium text-ink-100">
        Couldn&apos;t open this review
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        Something went wrong loading this contract. Try again, or return to your
        contracts.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-lg bg-counsel-500 px-4 text-sm font-medium text-ink-950 transition-colors hover:bg-counsel-600"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-lg border border-ink-700 px-4 text-sm font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-white"
        >
          Back to contracts
        </Link>
      </div>
    </div>
  );
}
