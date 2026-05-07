export function ClauseExample({
  title,
  jurisdiction,
  children,
}: {
  title?: string;
  jurisdiction?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-8 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-lg">
      {(title || jurisdiction) && (
        <figcaption className="flex items-center justify-between border-b border-ink-700 bg-ink-800 px-5 py-3">
          {title && (
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink-300">
              {title}
            </span>
          )}
          {jurisdiction && (
            <span className="rounded-full border border-counsel-500/30 bg-counsel-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-counsel-200">
              {jurisdiction}
            </span>
          )}
        </figcaption>
      )}
      <div className="px-6 py-5 font-mono text-[13.5px] leading-relaxed text-ink-100">
        {children}
      </div>
    </figure>
  );
}
