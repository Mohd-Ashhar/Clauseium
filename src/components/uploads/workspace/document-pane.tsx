"use client";

import type { StructuredDocument } from "@/types/ingestion";
import { cn } from "@/lib/utils";
import type { ClauseActionState } from "../clause-actions";
import { stripCiteTokens } from "./lib";
import type { ClauseEdit, ClauseWorkspaceItem, ViewMode } from "./shared";

export function DocumentPane({
  title,
  originalFilename,
  pageCount,
  structured,
  clauseById,
  activeClauseId,
  setActiveClauseId,
  clauseStates,
  clauseEdits,
  viewMode,
  setViewMode,
}: {
  title: string;
  originalFilename: string;
  pageCount: number | null;
  structured: StructuredDocument;
  clauseById: Map<string, ClauseWorkspaceItem>;
  activeClauseId: string | null;
  setActiveClauseId: (id: string | null) => void;
  clauseStates: Record<string, ClauseActionState>;
  clauseEdits: Record<string, ClauseEdit>;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
}) {
  return (
    <div className="h-full flex flex-col bg-ink-850 min-h-0">
      <div className="flex-1 overflow-y-auto dark-scrollbar">
        <article className="max-w-3xl mx-auto px-12 py-10">
          <header className="pb-6 mb-6 border-b border-ink-700/60">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink-100 leading-tight">
                  {title}
                </h1>
                <p className="text-[13px] text-ink-500 mt-2">
                  {originalFilename}
                  {pageCount ? ` · ${pageCount} pages` : ""}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 pt-1">
                <span className="hidden sm:inline text-[11px] text-ink-500">
                  Show
                </span>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
              </div>
            </div>
          </header>
          <div className="space-y-1">
            {structured.sections.map((section, i) => (
              <section key={`${section.title}-${i}`} className="pt-4">
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-ink-100 mb-2">
                  {section.title}
                </h2>
                <div className="space-y-1">
                  {section.clauses.map((clause) => {
                    const item = clauseById.get(clause.id);
                    const lvl = item?.risk?.level;
                    const isActive = activeClauseId === clause.id;
                    const state = clauseStates[clause.id] ?? "pending";
                    const edit = clauseEdits[clause.id];
                    const suggestion = stripCiteTokens(item?.risk?.suggestion ?? null);
                    const finalText =
                      state === "modified"
                        ? edit?.modifiedText ?? null
                        : state === "accepted"
                          ? suggestion || null
                          : null;
                    const accent =
                      lvl === "high"
                        ? "before:bg-risk-high"
                        : lvl === "medium"
                          ? "before:bg-risk-med"
                          : lvl === "missing"
                            ? "before:bg-risk-info"
                            : "before:bg-transparent";
                    return (
                      <div
                        key={clause.id}
                        id={`doc-clause-${clause.id}`}
                        role={item ? "button" : undefined}
                        tabIndex={item ? 0 : undefined}
                        onClick={item ? () => setActiveClauseId(clause.id) : undefined}
                        onKeyDown={
                          item
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setActiveClauseId(clause.id);
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          "relative pl-6 py-3 my-1 rounded transition-colors",
                          "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-full",
                          item &&
                            "cursor-pointer hover:bg-ink-800/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-counsel-500/40",
                          accent,
                          isActive && "bg-counsel-500/5",
                        )}
                      >
                        <p className="text-[14px] leading-[1.85] text-ink-200 whitespace-pre-wrap">
                          <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-500 mr-2">
                            #{clause.position}
                          </span>
                          {state !== "pending" && <DocStatusTag state={state} />}
                          <DocClauseText
                            original={clause.text}
                            finalText={finalText}
                            state={state}
                            viewMode={viewMode}
                          />
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
}) {
  const opts: Array<{ key: ViewMode; label: string }> = [
    { key: "redlined", label: "Redlined" },
    { key: "original", label: "Original" },
    { key: "clean", label: "Clean" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-ink-900 border border-ink-700 p-0.5">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setViewMode(o.key)}
          aria-pressed={viewMode === o.key}
          className={cn(
            "text-[11.5px] px-2.5 py-1 rounded-md transition-colors",
            viewMode === o.key
              ? "bg-counsel-500/15 text-counsel-200"
              : "text-ink-500 hover:text-ink-300",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// A tiny status chip shown inline at the head of a decided clause in the
// document pane, so an applied/rejected redline is scannable while reading.
function DocStatusTag({ state }: { state: ClauseActionState }) {
  const meta =
    state === "accepted"
      ? { label: "Accepted", tone: "bg-risk-low/15 text-risk-low" }
      : state === "modified"
        ? { label: "Edited", tone: "bg-counsel-500/15 text-counsel-200" }
        : { label: "Rejected", tone: "bg-ink-700 text-ink-400" };
  return (
    <span
      className={cn(
        "inline-flex items-center align-middle mr-2 px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wider font-medium",
        meta.tone,
      )}
    >
      {meta.label}
    </span>
  );
}

// Renders a clause's body in the document pane according to the chosen view:
//   • original  → always the source text
//   • clean     → the final text (accepted suggestion / edited wording) applied
//   • redlined  → original struck through + final text inserted (tracked-change
//                 styling) for accepted/modified clauses; rejected stays faint.
function DocClauseText({
  original,
  finalText,
  state,
  viewMode,
}: {
  original: string;
  finalText: string | null;
  state: ClauseActionState;
  viewMode: ViewMode;
}) {
  const hasChange =
    (state === "accepted" || state === "modified") &&
    finalText != null &&
    finalText.trim().length > 0;

  if (viewMode === "original" || !hasChange) {
    if (state === "rejected") {
      return <span className="text-ink-400">{original}</span>;
    }
    return <>{original}</>;
  }

  if (viewMode === "clean") {
    return <span className="text-ink-100">{finalText}</span>;
  }

  // redlined
  return (
    <>
      <span className="text-risk-high/70 line-through decoration-risk-high/50">
        {original}
      </span>{" "}
      <span className="text-risk-low bg-risk-low/10 rounded px-1 py-0.5">
        {finalText}
      </span>
    </>
  );
}
