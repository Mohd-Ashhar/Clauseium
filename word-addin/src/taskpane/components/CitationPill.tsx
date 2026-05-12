import { ExternalLink } from "lucide-react";
import { CITATION_LABELS, CITATION_TONES } from "@addin/lib/constants";
import type { LegalCitation } from "@addin/types/contract";

export function CitationPill({ citation }: { citation: LegalCitation }) {
  const tone = CITATION_TONES[citation.status];
  const label = CITATION_LABELS[citation.status];
  const sectionStripped = citation.section.replace(/^section\s+/i, "").trim();
  const display = sectionStripped
    ? `${citation.source} § ${sectionStripped}`
    : citation.source;

  // indiacode.nic.in/handle/... URLs land on a 404-prone redirect page —
  // don't surface those as links. Everything else is opened in a new tab.
  const linkable =
    citation.url &&
    !/^https?:\/\/(www\.)?indiacode\.nic\.in\/handle\//i.test(citation.url);

  if (linkable && citation.url) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group inline-flex items-center gap-1.5 border rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${tone}`}
        title={citation.warning ?? `Status: ${label}`}
      >
        <span className="font-[family-name:var(--font-mono)]">{display}</span>
        <span className="text-[9.5px] uppercase tracking-wider opacity-80">
          {label}
        </span>
        <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
      </a>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-md px-2 py-0.5 text-[11px] font-medium ${tone}`}
      title={citation.warning ?? `Status: ${label}`}
    >
      <span className="font-[family-name:var(--font-mono)]">{display}</span>
      <span className="text-[9.5px] uppercase tracking-wider opacity-80">
        {label}
      </span>
    </span>
  );
}
