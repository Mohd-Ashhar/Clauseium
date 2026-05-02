"use client";

import { useEffect, useRef } from "react";
import type { ClauseAnalysis } from "@/types/contract";
import { useReview } from "./review-context";
import { ClauseGutter } from "./clause-gutter";
import { InlineHighlight } from "./inline-highlight";
import { SelectionToolbar } from "./selection-toolbar";
import { cn } from "@/lib/utils";

export function DocumentViewer() {
  const { contract, activeClauseId } = useReview();
  const containerRef = useRef<HTMLDivElement>(null);
  const allClauses = contract.clauses ?? [];

  // Pulse the active clause when it changes via the right pane.
  useEffect(() => {
    if (!activeClauseId) return;
    const el = document.getElementById(`doc-clause-${activeClauseId}`);
    if (!el) return;
    el.classList.add("animate-pulse");
    const t = setTimeout(() => el.classList.remove("animate-pulse"), 900);
    return () => clearTimeout(t);
  }, [activeClauseId]);

  const intro = `THIS MASTER SERVICES AGREEMENT (the "Agreement") is made and entered into as of the Effective Date by and between ${contract.counterparty}, a company incorporated under the laws of India, and TechCo India Private Limited. The parties agree as follows:`;

  return (
    <div className="h-full flex flex-col bg-ink-850 min-h-0 relative">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto dark-scrollbar"
      >
        <article className="max-w-3xl mx-auto px-12 py-10">
          <header className="pb-6 mb-6 border-b border-ink-700/60">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-100 leading-tight">
              {contract.title}
            </h1>
            <p className="text-[13px] text-ink-500 mt-2">
              {contract.counterparty} · {contract.jurisdiction} · v{contract.version}
            </p>
          </header>

          <p className="text-[14px] leading-[1.85] text-ink-300 mb-8">{intro}</p>

          {allClauses.map((c) => (
            <ClauseParagraph key={c.id} clause={c} />
          ))}

          <p className="text-[14px] leading-[1.85] text-ink-300 mt-8 italic">
            IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.
          </p>
        </article>
      </div>

      <SelectionToolbar containerRef={containerRef} />
    </div>
  );
}

function ClauseParagraph({ clause }: { clause: ClauseAnalysis }) {
  const { activeClauseId } = useReview();
  const isActive = activeClauseId === clause.id;
  const hasGutter =
    clause.riskLevel === "high" ||
    clause.riskLevel === "medium" ||
    clause.riskLevel === "missing" ||
    clause.riskLevel === "standard";

  // Missing clauses are rendered as italic placeholders.
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

  const showHighlight = clause.riskLevel === "high" || clause.riskLevel === "medium";

  return (
    <section
      id={`doc-clause-${clause.id}`}
      className={cn(
        "relative pl-6 py-3 my-2 rounded transition-colors",
        isActive && "bg-brand-500/5",
      )}
    >
      {hasGutter && <ClauseGutter clauseId={clause.id} riskLevel={clause.riskLevel} />}
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
