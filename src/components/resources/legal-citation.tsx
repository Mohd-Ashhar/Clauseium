export function LegalCitation({
  statute,
  section,
  text,
  children,
}: {
  statute: string;
  section?: string;
  text?: string;
  children?: React.ReactNode;
}) {
  const label = section ? `${statute} § ${section}` : statute;

  return (
    <span className="group relative inline-flex items-center">
      <cite
        className="not-italic font-mono text-[12px] font-medium text-counsel-600 underline decoration-counsel-500/40 decoration-dotted underline-offset-4"
        title={text}
      >
        {label}
      </cite>
      {(text || children) && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-md border border-paper-200 bg-white px-3 py-2 text-[12px] leading-relaxed text-paper-900 shadow-lg group-hover:block"
        >
          {text ?? children}
        </span>
      )}
    </span>
  );
}
