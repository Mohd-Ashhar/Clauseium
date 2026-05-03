"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ClauseAnalysis, DocumentSection, RiskLevel } from "@/types/contract";
import { useReview } from "./review-context";
import { ClauseGutter } from "./clause-gutter";
import { InlineHighlight } from "./inline-highlight";
import { SelectionToolbar } from "./selection-toolbar";
import { cn } from "@/lib/utils";

export function DocumentViewer() {
  const { contract, activeClauseId } = useReview();
  const containerRef = useRef<HTMLDivElement>(null);
  const sections = contract.documentSections;
  const allClauses = contract.clauses ?? [];
  const clauseById = useMemo(() => {
    const m = new Map<string, ClauseAnalysis>();
    allClauses.forEach((c) => m.set(c.id, c));
    return m;
  }, [allClauses]);

  // Pulse the active clause when it changes via the right pane.
  useEffect(() => {
    if (!activeClauseId) return;
    const el = document.getElementById(`doc-clause-${activeClauseId}`);
    if (!el) return;
    el.classList.add("doc-section-pulse");
    const t = setTimeout(() => el.classList.remove("doc-section-pulse"), 1500);
    return () => clearTimeout(t);
  }, [activeClauseId]);

  return (
    <div className="h-full flex flex-col bg-ink-850 min-h-0 relative">
      <div ref={containerRef} className="flex-1 overflow-y-auto dark-scrollbar">
        <article className="max-w-3xl mx-auto px-12 py-10">
          <header className="pb-6 mb-6 border-b border-ink-700/60">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-100 leading-tight">
              {contract.title}
            </h1>
            <p className="text-[13px] text-ink-500 mt-2">
              {contract.counterparty} · {contract.jurisdiction} · v{contract.version}
            </p>
          </header>

          {sections && sections.length > 0 ? (
            <StructuredDocument sections={sections} clauseById={clauseById} />
          ) : allClauses.length > 0 ? (
            <FallbackClauseDocument contract={contract} />
          ) : (
            <PlaceholderDocument />
          )}

          <p className="text-[14px] leading-[1.85] text-ink-300 mt-10 italic">
            IN WITNESS WHEREOF, the parties have executed this Agreement as of the date
            first written above.
          </p>
        </article>
      </div>

      <SelectionToolbar containerRef={containerRef} />
    </div>
  );
}

function StructuredDocument({
  sections,
  clauseById,
}: {
  sections: DocumentSection[];
  clauseById: Map<string, ClauseAnalysis>;
}) {
  return (
    <div className="space-y-1">
      {sections.map((s, idx) => (
        <DocumentSectionView
          key={`${s.sectionNumber}-${idx}`}
          section={s}
          clause={s.clauseId ? clauseById.get(s.clauseId) : undefined}
        />
      ))}
    </div>
  );
}

function DocumentSectionView({
  section,
  clause,
}: {
  section: DocumentSection;
  clause: ClauseAnalysis | undefined;
}) {
  const { activeClauseId } = useReview();
  const isActive = clause ? activeClauseId === clause.id : false;
  const riskLevel = section.riskLevel ?? clause?.riskLevel;

  if (section.isHeading) {
    return (
      <div className="pt-6 pb-2">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-ink-100">
          {section.sectionNumber ? (
            <>
              <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 mr-2">
                {section.sectionNumber}
              </span>
              {section.title}
            </>
          ) : (
            section.title
          )}
        </h2>
        {section.content && (
          <p className="text-[14px] leading-[1.85] text-ink-300 mt-2 whitespace-pre-line">
            {section.content}
          </p>
        )}
      </div>
    );
  }

  if (riskLevel === "missing") {
    return (
      <div
        id={clause ? `doc-clause-${clause.id}` : undefined}
        className={cn(
          "relative pl-6 py-3 my-3 rounded transition-colors",
          isActive && "bg-brand-500/5",
        )}
      >
        {clause && <ClauseGutter clauseId={clause.id} riskLevel="missing" />}
        <p className="text-[14px] leading-[1.85] text-ink-500 italic">
          {section.content}
        </p>
      </div>
    );
  }

  return (
    <section
      id={clause ? `doc-clause-${clause.id}` : undefined}
      className={cn(
        "relative pl-6 py-3 my-1 rounded transition-colors",
        isActive && "bg-brand-500/5",
      )}
    >
      {clause && riskLevel && (
        <ClauseGutter clauseId={clause.id} riskLevel={riskLevel} />
      )}
      <p className="text-[14px] leading-[1.85] text-ink-200">
        {section.sectionNumber && section.sectionNumber !== "—" && (
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 mr-2">
            {section.sectionNumber}
          </span>
        )}
        {section.title && (
          <span className="font-medium text-ink-100">{section.title}. </span>
        )}
        <SectionContent
          content={section.content}
          highlights={section.highlights}
          clauseId={clause?.id}
        />
      </p>
    </section>
  );
}

function SectionContent({
  content,
  highlights,
  clauseId,
}: {
  content: string;
  highlights?: { text: string; riskLevel: RiskLevel }[];
  clauseId?: string;
}) {
  if (!highlights || highlights.length === 0 || !clauseId) {
    return <>{content}</>;
  }

  // Build segments by splitting content at each highlight boundary.
  const segments: { text: string; risk?: RiskLevel }[] = [{ text: content }];
  for (const h of highlights) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.risk) continue;
      const idx = seg.text.indexOf(h.text);
      if (idx === -1) continue;
      const before = seg.text.slice(0, idx);
      const match = seg.text.slice(idx, idx + h.text.length);
      const after = seg.text.slice(idx + h.text.length);
      const replacement: { text: string; risk?: RiskLevel }[] = [];
      if (before) replacement.push({ text: before });
      replacement.push({ text: match, risk: h.riskLevel });
      if (after) replacement.push({ text: after });
      segments.splice(i, 1, ...replacement);
      break;
    }
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.risk && (seg.risk === "high" || seg.risk === "medium") ? (
          <InlineHighlight key={i} clauseId={clauseId} riskLevel={seg.risk}>
            {seg.text}
          </InlineHighlight>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

// Fallback when a contract has clauses but no documentSections (legacy path)
function FallbackClauseDocument({
  contract,
}: {
  contract: import("@/types/contract").Contract;
}) {
  const allClauses = contract.clauses ?? [];
  const intro = `THIS AGREEMENT (the "Agreement") is made and entered into as of the Effective Date by and between ${contract.counterparty} and the Customer. The parties agree as follows:`;
  return (
    <>
      <p className="text-[14px] leading-[1.85] text-ink-300 mb-8">{intro}</p>
      {allClauses.map((c) => (
        <FallbackClauseParagraph key={c.id} clause={c} />
      ))}
    </>
  );
}

function FallbackClauseParagraph({ clause }: { clause: ClauseAnalysis }) {
  const { activeClauseId } = useReview();
  const isActive = activeClauseId === clause.id;
  const showHighlight = clause.riskLevel === "high" || clause.riskLevel === "medium";

  if (clause.riskLevel === "missing") {
    return (
      <div
        id={`doc-clause-${clause.id}`}
        className={cn(
          "relative pl-6 py-3 my-3 rounded transition-colors",
          isActive && "bg-brand-500/5",
        )}
      >
        <ClauseGutter clauseId={clause.id} riskLevel="missing" />
        <p className="text-[14px] leading-[1.85] text-ink-500 italic">
          [Missing: {clause.title} — recommended addition. See analysis panel.]
        </p>
      </div>
    );
  }

  return (
    <section
      id={`doc-clause-${clause.id}`}
      className={cn(
        "relative pl-6 py-3 my-2 rounded transition-colors",
        isActive && "bg-brand-500/5",
      )}
    >
      <ClauseGutter clauseId={clause.id} riskLevel={clause.riskLevel} />
      <p className="text-[14px] leading-[1.85] text-ink-200">
        <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 mr-2">
          {clause.clauseNumber === "—" ? "" : clause.clauseNumber}
        </span>
        {clause.clauseNumber !== "—" && (
          <span className="font-medium text-ink-100">{clause.title}. </span>
        )}
        {showHighlight ? (
          <InlineHighlight clauseId={clause.id} riskLevel={clause.riskLevel}>
            {clause.originalText}
          </InlineHighlight>
        ) : (
          clause.originalText
        )}
      </p>
    </section>
  );
}

function PlaceholderDocument() {
  return (
    <div className="text-center py-12">
      <p className="text-[14px] text-ink-500">
        Full document preview coming soon. Use the analysis panel to review the clauses
        identified by the AI.
      </p>
    </div>
  );
}
