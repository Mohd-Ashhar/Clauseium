import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function ContractNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-700 bg-ink-850">
        <FileQuestion className="h-6 w-6 text-ink-400" />
      </div>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-medium text-ink-100">
        Contract not found
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        This contract doesn&apos;t exist, has been deleted, or isn&apos;t part of
        your workspace.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-counsel-500 px-4 text-sm font-medium text-ink-950 transition-colors hover:bg-counsel-600"
      >
        Back to contracts
      </Link>
    </div>
  );
}
