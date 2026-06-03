"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-700 bg-ink-850">
        <AlertTriangle className="h-6 w-6 text-risk-med" />
      </div>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-medium text-ink-100">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        We hit an unexpected error loading this view. Your contracts are safe —
        try again, or head back to your dashboard.
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
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
