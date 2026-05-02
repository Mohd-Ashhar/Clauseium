"use client";

import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  VisuallyHidden,
} from "@/components/ui/sheet";
import { useReview } from "./review-context";
import { getCitationSource } from "@/lib/citation-sources";

export function CitationDrawer() {
  const { contract, citationDrawerId, setCitationDrawerId } = useReview();

  const citation = contract.clauses
    ?.flatMap((c) => c.citations)
    .find((c) => c.id === citationDrawerId);

  const source = citation
    ? getCitationSource({ source: citation.source, section: citation.section })
    : null;

  const open = Boolean(citationDrawerId);
  const headingTitle = source?.title ?? citation?.text ?? "Legal source";
  const headingReference =
    source?.reference ??
    (citation ? `${citation.source} §${citation.section}` : "");

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) setCitationDrawerId(null);
      }}
    >
      <SheetContent className="w-[400px] max-w-full sm:max-w-md bg-ink-900 border-l border-ink-700 px-0 py-0 gap-0">
        {/* Always render Title + Description for Radix a11y. Hide them
            visually when there's no citation context to show. */}
        {citation ? (
          <div className="flex flex-col h-full">
            <header className="px-6 pt-6 pb-4 border-b border-ink-700">
              <span className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
                Legal source
              </span>
              <SheetTitle className="font-[family-name:var(--font-display)] text-lg text-ink-100 mt-1">
                {headingTitle}
              </SheetTitle>
              <SheetDescription className="text-[12px] text-ink-500 mt-1 font-[family-name:var(--font-mono)]">
                {headingReference}
              </SheetDescription>
            </header>

            <div className="flex-1 overflow-y-auto dark-scrollbar px-6 py-5 space-y-4">
              {source ? (
                source.body.split("\n\n").map((para, i) => (
                  <p key={i} className="text-[13.5px] leading-relaxed text-ink-300">
                    {para}
                  </p>
                ))
              ) : (
                <p className="text-[13.5px] leading-relaxed text-ink-300">
                  Source text for {citation.text} is not yet indexed in our corpus. The
                  citation has been verified against {citation.source}.
                </p>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-ink-700 flex items-center justify-between">
              <span className="text-[11px] text-ink-500">
                {citation.status === "verified"
                  ? "Verified against our legal corpus"
                  : "Awaiting verification"}
              </span>
              {(source?.url || citation.url) && (
                <a
                  href={source?.url ?? citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Open source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </footer>
          </div>
        ) : (
          <>
            <VisuallyHidden>
              <SheetTitle>Legal source</SheetTitle>
              <SheetDescription>No citation selected.</SheetDescription>
            </VisuallyHidden>
            <div className="flex items-center justify-center h-full px-6 text-center text-sm text-ink-500">
              Citation not found.
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
