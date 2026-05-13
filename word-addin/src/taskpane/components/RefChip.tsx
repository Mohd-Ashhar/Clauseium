import { BookOpen, ExternalLink, Scale } from "lucide-react";
import { cn } from "@addin/lib/cn";
import type { RefBundle } from "@addin/types/contract";

// Two modes:
//   - inline: small "[REF_1]" pill that appears mid-paragraph in streamed
//     answers. Clickable when url is present, otherwise a static pill.
//   - block (default): a row chip with the citation text and a source-type
//     icon. Used below the message body in the refs strip.
//
// Statute citations use a book icon; case-law uses scales.

interface RefChipProps {
  ref: RefBundle;
  variant?: "inline" | "block";
}

export function RefChip({ ref, variant = "block" }: RefChipProps) {
  const linkable = Boolean(ref.url);

  if (variant === "inline") {
    const label = ref.ref_id;
    const tooltip = `${ref.citation}\n\n${ref.snippet}`;
    if (linkable && ref.url) {
      return (
        <a
          href={ref.url}
          target="_blank"
          rel="noopener noreferrer"
          title={tooltip}
          className="inline-flex items-center align-baseline border border-brand-400/40 bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 rounded px-1 py-px text-[10px] font-[family-name:var(--font-mono)] font-medium transition-colors"
        >
          {label}
        </a>
      );
    }
    return (
      <span
        title={tooltip}
        className="inline-flex items-center align-baseline border border-ink-700 bg-ink-800 text-ink-300 rounded px-1 py-px text-[10px] font-[family-name:var(--font-mono)] font-medium"
      >
        {label}
      </span>
    );
  }

  const SourceIcon = ref.source === "case" ? Scale : BookOpen;

  const inner = (
    <>
      <SourceIcon className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      <span className="font-[family-name:var(--font-mono)] text-[11px]">
        <span className="text-ink-500 mr-1">{ref.ref_id}</span>
        <span className="text-ink-200">{ref.citation}</span>
      </span>
      {linkable && (
        <ExternalLink
          className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 shrink-0"
          aria-hidden="true"
        />
      )}
    </>
  );

  const baseClasses = cn(
    "group inline-flex items-center gap-1.5 border border-ink-700 bg-ink-900 hover:border-ink-500 rounded-md px-2 py-1 max-w-full transition-colors",
  );

  if (linkable && ref.url) {
    return (
      <a
        href={ref.url}
        target="_blank"
        rel="noopener noreferrer"
        title={ref.snippet}
        className={baseClasses}
      >
        {inner}
      </a>
    );
  }

  return (
    <span title={ref.snippet} className={baseClasses}>
      {inner}
    </span>
  );
}
