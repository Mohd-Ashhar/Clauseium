"use client";

import { useMemo } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CitationChip } from "./citation-chip";
import { buildAuthorities } from "./workspace/lib";
import type { ClauseWorkspaceItem } from "./workspace/shared";

// The third pane CLAUDE.md mandates (document / analysis / citations) and a core
// trust artifact: counsel can see every place a statute is invoked and whether
// it was verified against our corpus. Aggregation lives in workspace/lib.ts
// (unit-tested) so this stays a thin presentational component.
export function CitationsPane({
  clauses,
  activeClauseId,
  onJumpToClause,
}: {
  clauses: ClauseWorkspaceItem[];
  activeClauseId: string | null;
  onJumpToClause: (clauseId: string) => void;
}) {
  const authorities = useMemo(() => buildAuthorities(clauses), [clauses]);

  if (authorities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <BookOpen className="h-6 w-6 text-ink-600" />
        <p className="mt-3 text-sm text-ink-400">No authorities cited yet</p>
        <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
          Statutes and cases the analysis relies on will appear here, each with its
          verification status and the clauses that cite it.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <p className="text-[12px] leading-relaxed text-ink-500">
        {authorities.length} authorit{authorities.length === 1 ? "y" : "ies"} cited
        across this contract. A green check means verified against Clauseium&apos;s
        Indian-law corpus.
      </p>
      {authorities.map((a) => (
        <div
          key={a.key}
          className="rounded-xl border border-ink-700 bg-ink-850 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-100">
                  {a.label}
                </span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-500 hover:text-counsel-400 transition-colors"
                    aria-label="Open source"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {a.warning && (
                <p className="mt-1 text-[11.5px] text-risk-med">{a.warning}</p>
              )}
            </div>
            <CitationChip status={a.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink-500">Cited by</span>
            {a.relying.map((r) => (
              <button
                key={r.clauseId}
                type="button"
                onClick={() => onJumpToClause(r.clauseId)}
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] transition-colors",
                  activeClauseId === r.clauseId
                    ? "border-counsel-500/50 bg-counsel-500/15 text-counsel-200"
                    : "border-ink-700 bg-ink-900 text-ink-300 hover:border-counsel-500/40 hover:text-counsel-200",
                )}
              >
                §{r.position}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
