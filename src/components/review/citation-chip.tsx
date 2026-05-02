"use client";

import { CheckCircle2 } from "lucide-react";
import type { LegalCitation } from "@/types/contract";
import { useReview } from "./review-context";

export function CitationChip({ citation }: { citation: LegalCitation }) {
  const { setCitationDrawerId } = useReview();
  const verified = citation.status === "verified";
  return (
    <button
      onClick={() => setCitationDrawerId(citation.id)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ink-800 border border-ink-700 rounded-lg text-xs cursor-pointer hover:border-brand-500/40 hover:bg-ink-800/80 transition-colors"
      type="button"
    >
      <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-300">
        {citation.text}
      </span>
      {verified && (
        <span className="inline-flex items-center gap-0.5 text-risk-low">
          <CheckCircle2 className="h-3 w-3" />
          <span className="text-[10px]">verified</span>
        </span>
      )}
    </button>
  );
}
