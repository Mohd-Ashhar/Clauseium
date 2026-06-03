import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center text-ink-100">
      <div className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight">
        <span className="text-counsel-500">§</span> Clauseium
      </div>
      <h1 className="mt-8 font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,4rem)] font-medium leading-none">
        404
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-lg bg-counsel-500 px-5 text-sm font-medium text-ink-950 transition-colors hover:bg-counsel-600"
      >
        Back home
      </Link>
    </div>
  );
}
