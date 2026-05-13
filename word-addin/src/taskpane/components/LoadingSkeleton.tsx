// Branded loading skeleton shown while Office.js boots. Replaces the bare
// spinner with the Clauseium § mark + three pulsing bars so the first paint
// reads as "Clauseium is starting" rather than "this is broken."
//
// prefers-reduced-motion is honored via tokens.css — the global rule there
// nukes the pulse animation when the OS-level reduce-motion preference is on.

export function LoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col items-center justify-center px-8">
      <div
        className="font-[family-name:var(--font-display)] text-[24px] font-bold tracking-tight mb-5"
        aria-label="Clauseium"
      >
        <span className="text-brand-400">§</span>{" "}
        <span className="text-ink-100">Clauseium</span>
      </div>
      <div
        className="flex flex-col gap-2 w-[160px]"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <span className="h-2 rounded-full bg-ink-800 animate-pulse [animation-delay:0ms]" />
        <span className="h-2 rounded-full bg-ink-800 animate-pulse [animation-delay:200ms] w-[80%]" />
        <span className="h-2 rounded-full bg-ink-800 animate-pulse [animation-delay:400ms] w-[60%]" />
      </div>
    </div>
  );
}
