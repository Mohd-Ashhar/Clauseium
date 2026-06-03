"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Download,
  ExternalLink,
  Gavel,
  GripHorizontal,
  Info,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Printer,
  Share2,
  X,
  Zap,
} from "lucide-react";
import type {
  DocumentAnalysisView,
  LegalCitation,
  RiskLevel,
} from "@/types/contract";
import { AskAiChat } from "./ask-ai-chat";
import { CitationsPane } from "./citations-pane";
import { type ClauseActionState } from "./clause-actions";
import { RedlineEditor } from "./redline-editor";
import { cn } from "@/lib/utils";
import { DocumentPane } from "./workspace/document-pane";
import {
  ACCENT_BORDER,
  CATEGORY_LABELS,
  CITATION_LABELS,
  CITATION_TONES,
  EMPTY_EDIT,
  POSTURE_META,
  RISK_BADGE,
  type ClauseEdit,
  type ClauseWorkspaceItem,
  type ExportFormat,
  type FilterLevel,
  type ToastItem,
  type UploadWorkspaceProps,
  type ViewMode,
  type WorkspaceSummary,
} from "./workspace/shared";
import {
  clauseAtOffset,
  nextHighRiskClause,
  sortAndFilterClauses,
  stripCiteTokens,
} from "./workspace/lib";

// page.tsx imports these workspace types from this module — keep them exported.
export type {
  ClauseWorkspaceItem,
  WorkspaceSummary,
} from "./workspace/shared";

// Render exactly ONE layout (desktop split-panes OR mobile tabs) rather than
// both behind CSS — so clause anchor ids (doc-clause-*/card-clause-*) are never
// duplicated in the DOM. Defaults to desktop on the server / first paint to
// match SSR, then corrects after mount (no hydration mismatch).
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function UploadWorkspace({
  contractId,
  contractTitle,
  originalFilename,
  pageCount,
  structured,
  clauses,
  summary,
  documentAnalysis = null,
  partial = false,
  analysisNotes = [],
}: UploadWorkspaceProps) {
  const [filter, setFilter] = useState<FilterLevel>("all");
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [clauseStates, setClauseStates] = useState<
    Record<string, ClauseActionState>
  >(() => {
    const init: Record<string, ClauseActionState> = {};
    for (const c of clauses) init[c.id] = c.action;
    return init;
  });
  const [clauseEdits, setClauseEdits] = useState<Record<string, ClauseEdit>>(
    () => {
      const init: Record<string, ClauseEdit> = {};
      for (const c of clauses) {
        init[c.id] = {
          modifiedText: c.actionModifiedText ?? null,
          saving: false,
          error: null,
        };
      }
      return init;
    },
  );
  // How the document pane renders accepted/modified clauses: with tracked-change
  // styling (redlined), the original source (original), or the final text (clean).
  const [viewMode, setViewMode] = useState<ViewMode>("redlined");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileTab, setMobileTab] = useState<"document" | "analysis" | "chat">(
    "analysis",
  );
  const toastIdRef = useRef(0);

  const toast = (message: string, tone: "success" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Pulse the active clause when it changes via the right pane.
  useEffect(() => {
    if (!activeClauseId) return;
    const docEl = document.getElementById(`doc-clause-${activeClauseId}`);
    const cardEl = document.getElementById(`card-clause-${activeClauseId}`);
    docEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    cardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (docEl) {
      docEl.classList.add("doc-section-pulse");
      const t = setTimeout(
        () => docEl.classList.remove("doc-section-pulse"),
        1500,
      );
      return () => clearTimeout(t);
    }
  }, [activeClauseId]);

  const setClauseAction = async (
    clauseId: string,
    next: Exclude<ClauseActionState, "pending">,
    opts?: { modifiedText?: string },
  ): Promise<boolean> => {
    // Guard against a second action on the same clause while one is in flight
    // (the buttons disable on `saving`, this is defence in depth).
    if ((clauseEdits[clauseId] ?? EMPTY_EDIT).saving) return false;
    const prevState = clauseStates[clauseId] ?? "pending";
    const prevEdit = clauseEdits[clauseId] ?? EMPTY_EDIT;
    // Edited text only rides with the "modified" state; clear it otherwise so an
    // accepted/rejected clause never carries stale edits.
    const nextModified =
      next === "modified"
        ? opts?.modifiedText ?? prevEdit.modifiedText
        : null;

    setClauseStates((s) => ({ ...s, [clauseId]: next }));
    setClauseEdits((s) => ({
      ...s,
      [clauseId]: { modifiedText: nextModified, saving: true, error: null },
    }));

    try {
      const res = await fetch(`/api/contracts/${contractId}/clause-actions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause_id: clauseId,
          state: next,
          ...(next === "modified" && nextModified != null
            ? { modified_text: nextModified }
            : {}),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json().catch(() => null)) as
        | { action?: { modified_text?: string | null } }
        | null;
      const serverModified =
        next === "modified"
          ? json?.action?.modified_text ?? nextModified
          : null;
      setClauseEdits((s) => ({
        ...s,
        [clauseId]: { modifiedText: serverModified, saving: false, error: null },
      }));
      return true;
    } catch {
      setClauseStates((s) => ({ ...s, [clauseId]: prevState }));
      setClauseEdits((s) => ({
        ...s,
        [clauseId]: { ...prevEdit, saving: false, error: "Could not save — try again" },
      }));
      toast("Could not save — try again", "info");
      return false;
    }
  };

  const resetClauseAction = async (clauseId: string) => {
    if ((clauseEdits[clauseId] ?? EMPTY_EDIT).saving) return;
    const prevState = clauseStates[clauseId] ?? "pending";
    const prevEdit = clauseEdits[clauseId] ?? EMPTY_EDIT;
    setClauseStates((s) => ({ ...s, [clauseId]: "pending" }));
    setClauseEdits((s) => ({
      ...s,
      [clauseId]: { modifiedText: null, saving: true, error: null },
    }));
    try {
      const res = await fetch(`/api/contracts/${contractId}/clause-actions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clause_id: clauseId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setClauseEdits((s) => ({ ...s, [clauseId]: EMPTY_EDIT }));
    } catch {
      setClauseStates((s) => ({ ...s, [clauseId]: prevState }));
      setClauseEdits((s) => ({
        ...s,
        [clauseId]: { ...prevEdit, saving: false, error: "Could not reset — try again" },
      }));
      toast("Could not reset — try again", "info");
    }
  };

  // Export runs server-side (POST /api/contracts/[id]/export). The server reads
  // the persisted clause_actions (incl. modified_text) so the download reflects
  // exactly what the reviewer decided — and the redlined/clean DOCX are tracked
  // changes injected into the ORIGINAL document, preserving its formatting.
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const exportContractAs = async (format: ExportFormat) => {
    if (isExporting) return;
    setIsExporting(format);
    const labelMap: Record<ExportFormat, string> = {
      redlined: "Redlined Word doc",
      clean: "Clean Word doc",
      summary: "Risk summary PDF",
      full: "Full analysis report",
    };
    toast(`Generating ${labelMap[format]}…`, "info");
    try {
      const res = await fetch(`/api/contracts/${contractId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(err.message ?? err.error ?? String(res.status));
      }
      const cd = res.headers.get("Content-Disposition") ?? "";
      const isPdf = format === "summary" || format === "full";
      const filename =
        /filename="?([^"]+)"?/.exec(cd)?.[1] ??
        `${contractTitle}-${format}.${isPdf ? "pdf" : "docx"}`;
      const blob = await res.blob();
      const { triggerDownload } = await import("@/lib/export/download");
      triggerDownload(blob, filename);

      const reconstructed = res.headers.get("X-Redline-Reconstructed") === "true";
      const applied = res.headers.get("X-Redline-Applied");
      const fallback = res.headers.get("X-Redline-Fallback");
      if (reconstructed) {
        toast(
          `Downloaded ${filename} · reconstructed (original was a non-editable PDF)`,
          "success",
        );
      } else if (applied !== null) {
        const commented =
          fallback && fallback !== "0" ? `, ${fallback} as comments` : "";
        toast(
          `Downloaded ${filename} · ${applied} tracked change${
            applied === "1" ? "" : "s"
          }${commented}`,
          "success",
        );
      } else {
        toast(`Downloaded ${filename}`, "success");
      }
    } catch (err) {
      console.error("Export failed", err);
      toast(
        err instanceof Error ? `Export failed — ${err.message}` : "Export failed — please try again",
        "info",
      );
    } finally {
      setIsExporting(null);
    }
  };

  const acceptAllStandard = () => {
    let count = 0;
    for (const c of clauses) {
      const lvl = c.risk?.level;
      if ((!c.risk || lvl === "low" || lvl === "standard") &&
          (clauseStates[c.id] ?? "pending") !== "accepted") {
        void setClauseAction(c.id, "accepted");
        count++;
      }
    }
    toast(
      `Accepted ${count} standard clause${count === 1 ? "" : "s"}`,
      "success",
    );
  };

  const clauseById = useMemo(() => {
    const m = new Map<string, ClauseWorkspaceItem>();
    for (const c of clauses) m.set(c.id, c);
    return m;
  }, [clauses]);

  // Review progress: how many clauses have a decision (accept/modify/reject).
  const resolvedCount = useMemo(
    () =>
      clauses.filter((c) => (clauseStates[c.id] ?? "pending") !== "pending")
        .length,
    [clauses, clauseStates],
  );

  const visible = useMemo(
    () => sortAndFilterClauses(clauses, filter),
    [clauses, filter],
  );

  const isDesktop = useIsDesktop();

  // Keyboard model for fast review of long contracts. Ignored while typing in
  // an input/textarea (chat, redline editor) so it never hijacks text entry.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const list = visible;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          const next = clauseAtOffset(list, activeClauseId, 1);
          if (next) setActiveClauseId(next);
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          const next = clauseAtOffset(list, activeClauseId, -1);
          if (next) setActiveClauseId(next);
          break;
        }
        case "n":
        case "N": {
          e.preventDefault();
          const target = nextHighRiskClause(list, activeClauseId, e.key === "n");
          if (target) setActiveClauseId(target);
          break;
        }
        case "a":
          if (activeClauseId && clauseById.get(activeClauseId)?.risk?.suggestion) {
            e.preventDefault();
            void setClauseAction(activeClauseId, "accepted").then((ok) => {
              if (ok) toast("Redline accepted", "success");
            });
          }
          break;
        case "r":
          if (activeClauseId) {
            e.preventDefault();
            void setClauseAction(activeClauseId, "rejected").then((ok) => {
              if (ok) toast("Suggestion rejected");
            });
          }
          break;
        case "Escape":
          if (showShortcuts) setShowShortcuts(false);
          else if (activeClauseId) setActiveClauseId(null);
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, activeClauseId, clauseById, setClauseAction, showShortcuts]);

  return (
    <div className="-mx-6 -my-6 h-[calc(100vh-3.5rem)] flex flex-col bg-ink-950">
      <TopBar
        contractTitle={contractTitle}
        originalFilename={originalFilename}
        pageCount={pageCount}
        summary={summary}
        toast={toast}
        onExport={exportContractAs}
        isExporting={isExporting}
      />

      {partial && (
        <div
          role="status"
          className="mx-4 mt-3 flex items-start gap-2.5 rounded-lg border border-risk-med/30 bg-risk-med/10 px-4 py-2.5"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-risk-med mt-0.5" />
          <div className="text-[12.5px] leading-relaxed text-ink-200">
            <span className="font-medium text-risk-med">Partial analysis.</span>{" "}
            Some sections couldn&apos;t be fully analyzed, so this review may be
            incomplete — don&apos;t treat a low risk count as a clean result.
            {analysisNotes.length > 0 && (
              <span className="text-ink-400"> {analysisNotes.join(" · ")}</span>
            )}
          </div>
        </div>
      )}

      {isDesktop ? (
      <div className="flex flex-1 min-h-0">
        <Group orientation="horizontal" className="flex-1 flex">
          <Panel defaultSize={55} minSize={35} maxSize={70} className="min-w-0">
            <DocumentPane
              title={contractTitle}
              originalFilename={originalFilename}
              pageCount={pageCount}
              structured={structured}
              clauseById={clauseById}
              activeClauseId={activeClauseId}
              setActiveClauseId={setActiveClauseId}
              clauseStates={clauseStates}
              clauseEdits={clauseEdits}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </Panel>
          <Separator className="w-1 bg-ink-700 hover:bg-counsel-500 data-[resize-state=dragging]:bg-counsel-500 transition-colors cursor-col-resize" />
          <Panel defaultSize={45} minSize={30} maxSize={65} className="min-w-0">
            <RightColumn
              contractId={contractId}
              summary={summary}
              clauses={visible}
              allClauses={clauses}
              documentAnalysis={documentAnalysis}
              filter={filter}
              setFilter={setFilter}
              activeClauseId={activeClauseId}
              setActiveClauseId={setActiveClauseId}
              clauseStates={clauseStates}
              clauseEdits={clauseEdits}
              setClauseAction={setClauseAction}
              resetClauseAction={resetClauseAction}
              acceptAllStandard={acceptAllStandard}
              onExport={exportContractAs}
              resolvedCount={resolvedCount}
              toast={toast}
            />
          </Panel>
        </Group>
      </div>
      ) : (
      // Mobile: tabbed panes (Document | Analysis | Ask AI) instead of a long
      // stacked scroll, so a reviewer reaches findings without scrolling the
      // whole contract first.
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex shrink-0 border-b border-ink-700 bg-ink-900" role="tablist">
          {([
            ["analysis", "Analysis"],
            ["document", "Document"],
            ["chat", "Ask AI"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mobileTab === key}
              onClick={() => setMobileTab(key)}
              className={cn(
                "flex-1 py-3 text-[13px] font-medium transition-colors",
                mobileTab === key
                  ? "text-counsel-200 border-b-2 border-counsel-500"
                  : "text-ink-500 border-b-2 border-transparent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          {mobileTab === "document" && (
            <DocumentPane
              title={contractTitle}
              originalFilename={originalFilename}
              pageCount={pageCount}
              structured={structured}
              clauseById={clauseById}
              activeClauseId={activeClauseId}
              setActiveClauseId={setActiveClauseId}
              clauseStates={clauseStates}
              clauseEdits={clauseEdits}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          )}
          {mobileTab === "analysis" && (
            <AnalysisPane
              contractId={contractId}
              summary={summary}
              clauses={visible}
              allClauses={clauses}
              documentAnalysis={documentAnalysis}
              filter={filter}
              setFilter={setFilter}
              activeClauseId={activeClauseId}
              setActiveClauseId={setActiveClauseId}
              clauseStates={clauseStates}
              clauseEdits={clauseEdits}
              setClauseAction={setClauseAction}
              resetClauseAction={resetClauseAction}
              acceptAllStandard={acceptAllStandard}
              onExport={exportContractAs}
              resolvedCount={resolvedCount}
              toast={toast}
            />
          )}
          {mobileTab === "chat" && (
            <div className="h-full">
              <AskAiChat contractId={contractId} />
            </div>
          )}
        </div>
      </div>
      )}

      <ShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ToastContainer toasts={toasts} />
    </div>
  );
}

function ShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ["J / ↓", "Next clause"],
    ["K / ↑", "Previous clause"],
    ["N / ⇧N", "Next / previous high-risk clause"],
    ["A", "Accept the active clause's redline"],
    ["R", "Reject the active clause's suggestion"],
    ["Esc", "Clear selection"],
    ["?", "Toggle this help"],
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm p-6"
          onClick={onClose}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-850 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-100">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 space-y-2">
              {rows.map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <dt className="text-[13px] text-ink-300">{desc}</dt>
                  <dd className="font-[family-name:var(--font-mono)] text-[11.5px] text-ink-400 bg-ink-900 border border-ink-700 rounded px-1.5 py-0.5">
                    {key}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TopBar({
  contractTitle,
  originalFilename,
  pageCount,
  summary,
  toast,
  onExport,
  isExporting,
}: {
  contractTitle: string;
  originalFilename: string;
  pageCount: number | null;
  summary: WorkspaceSummary;
  toast: (m: string, t?: "success" | "info") => void;
  onExport: (format: ExportFormat) => Promise<void>;
  isExporting: ExportFormat | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const stdCount = summary.standard + summary.low;

  return (
    <header className="h-14 shrink-0 bg-ink-900 border-b border-ink-700 flex items-center px-3 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          href="/dashboard"
          className="h-8 w-8 flex items-center justify-center rounded text-ink-500 hover:text-ink-100 hover:bg-ink-850 transition-colors shrink-0"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[15px] font-medium text-ink-100 truncate"
            title={contractTitle}
          >
            {contractTitle}
          </span>
          <span className="bg-ink-800 text-ink-400 text-xs px-2 py-0.5 rounded font-[family-name:var(--font-mono)] shrink-0">
            v1
          </span>
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
        <Chip>{originalFilename}</Chip>
        {pageCount ? <Chip>{pageCount} pages</Chip> : null}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1.5">
          {summary.high > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-high/15 text-risk-high">
              {summary.high} High
            </span>
          )}
          {summary.medium > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-med/15 text-risk-med">
              {summary.medium} Med
            </span>
          )}
          {stdCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-risk-low/15 text-risk-low">
              {stdCount} Std
            </span>
          )}
        </div>

        <div className="relative">
          <div className="flex items-stretch">
            <button
              type="button"
              onClick={() => void onExport("redlined")}
              disabled={isExporting !== null}
              className="inline-flex items-center gap-1.5 bg-counsel-500 hover:bg-counsel-600 text-ink-950 text-sm font-medium pl-3.5 pr-3 py-1.5 rounded-l-lg transition-colors disabled:opacity-70 disabled:cursor-wait"
            >
              {isExporting === "redlined" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isExporting === "redlined"
                  ? "Generating…"
                  : "Export Redlined Word"}
              </span>
              <span className="sm:hidden">
                {isExporting !== null ? "…" : "Export"}
              </span>
            </button>
            <button
              type="button"
              aria-label="More export formats"
              onClick={() => setExportOpen((v) => !v)}
              disabled={isExporting !== null}
              className="inline-flex items-center justify-center bg-counsel-500 hover:bg-counsel-600 text-ink-950 px-1.5 rounded-r-lg border-l border-ink-950/20 transition-colors disabled:opacity-70 disabled:cursor-wait"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {exportOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-64 bg-ink-800 border border-ink-700 rounded-lg shadow-xl py-1 z-30"
              onMouseLeave={() => setExportOpen(false)}
            >
              <ExportMenuItem
                label="Redlined Word (.docx)"
                desc="Original document + tracked changes"
                busy={isExporting === "redlined"}
                onClick={() => {
                  setExportOpen(false);
                  void onExport("redlined");
                }}
              />
              <ExportMenuItem
                label="Clean Word (.docx)"
                desc="Final text with accepted changes applied"
                busy={isExporting === "clean"}
                onClick={() => {
                  setExportOpen(false);
                  void onExport("clean");
                }}
              />
              <div className="my-1 border-t border-ink-700" />
              <ExportMenuItem
                label="Risk summary (.pdf)"
                desc="Issues, risk levels & recommendations"
                busy={isExporting === "summary"}
                onClick={() => {
                  setExportOpen(false);
                  void onExport("summary");
                }}
              />
              <ExportMenuItem
                label="Full report (.pdf)"
                desc="Every clause with reasoning & citations"
                busy={isExporting === "full"}
                onClick={() => {
                  setExportOpen(false);
                  void onExport("full");
                }}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-ink-500 hover:text-ink-100 hover:bg-ink-850 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 bg-ink-800 border border-ink-700 rounded-lg shadow-xl py-1 z-30"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <MenuItem
                icon={<Download className="h-3.5 w-3.5" />}
                label="Download original"
                onClick={() => {
                  toast("Download will be available after backend integration");
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Share2 className="h-3.5 w-3.5" />}
                label="Share review"
                onClick={() => {
                  toast("Sharing coming in next phase");
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Printer className="h-3.5 w-3.5" />}
                label="Print summary"
                onClick={() => {
                  toast("Print summary coming in next phase");
                  setMenuOpen(false);
                }}
              />
              <div className="my-1 border-t border-ink-700" />
              <MenuItem
                icon={<Archive className="h-3.5 w-3.5" />}
                label="Archive"
                onClick={() => {
                  toast("Archiving coming in next phase");
                  setMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-ink-850 border border-ink-700 text-ink-400 text-xs px-2.5 py-1 rounded-full truncate max-w-[200px]">
      {children}
    </span>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-300 hover:bg-ink-850 hover:text-ink-100 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function ExportMenuItem({
  label,
  desc,
  busy,
  onClick,
}: {
  label: string;
  desc: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-ink-850 transition-colors"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 text-counsel-300 mt-0.5 shrink-0 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5 text-ink-500 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-[13px] text-ink-100">{label}</div>
        <div className="text-[11px] text-ink-500 leading-snug">{desc}</div>
      </div>
    </button>
  );
}

// Right column = AnalysisPane on top + AskAiChat on bottom, with a draggable
// horizontal resizer between them. We manage height in pixels (instead of using
// react-resizable-panels) because the chat needs a guaranteed minimum so the
// input box always stays visible above the fold.
const ASK_AI_DEFAULT_HEIGHT = 420;
const ASK_AI_MIN_HEIGHT = 56; // collapsed → just the header
const ASK_AI_HEADER_ONLY = 56;
const ANALYSIS_MIN_HEIGHT = 200;

function RightColumn({
  contractId,
  summary,
  clauses,
  allClauses,
  documentAnalysis,
  filter,
  setFilter,
  activeClauseId,
  setActiveClauseId,
  clauseStates,
  clauseEdits,
  setClauseAction,
  resetClauseAction,
  acceptAllStandard,
  onExport,
  resolvedCount,
  toast,
}: AnalysisPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [askHeight, setAskHeight] = useState(ASK_AI_DEFAULT_HEIGHT);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lastExpandedRef = useRef(ASK_AI_DEFAULT_HEIGHT);

  const effectiveHeight = collapsed ? ASK_AI_HEADER_ONLY : askHeight;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const startY = e.clientY;
    const startHeight = askHeight;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const containerHeight = containerRect?.height ?? 800;

    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY; // dragging up grows the chat
      const next = startHeight + delta;
      const max = Math.max(ASK_AI_MIN_HEIGHT, containerHeight - ANALYSIS_MIN_HEIGHT);
      const clamped = Math.min(max, Math.max(ASK_AI_MIN_HEIGHT, next));
      setAskHeight(clamped);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const toggleCollapsed = () => {
    if (collapsed) {
      setCollapsed(false);
      setAskHeight(lastExpandedRef.current);
    } else {
      lastExpandedRef.current = askHeight;
      setCollapsed(true);
    }
  };

  const expandToFill = () => {
    const containerHeight =
      containerRef.current?.getBoundingClientRect().height ?? 800;
    setCollapsed(false);
    setAskHeight(Math.max(ASK_AI_MIN_HEIGHT, containerHeight - ANALYSIS_MIN_HEIGHT));
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-ink-900 min-h-0">
      <div className="flex-1 min-h-0">
        <AnalysisPane
          contractId={contractId}
          summary={summary}
          clauses={clauses}
          allClauses={allClauses}
          documentAnalysis={documentAnalysis}
          filter={filter}
          setFilter={setFilter}
          activeClauseId={activeClauseId}
          setActiveClauseId={setActiveClauseId}
          clauseStates={clauseStates}
          clauseEdits={clauseEdits}
          setClauseAction={setClauseAction}
          resetClauseAction={resetClauseAction}
          acceptAllStandard={acceptAllStandard}
          onExport={onExport}
          resolvedCount={resolvedCount}
          toast={toast}
        />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize Ask Clauseium panel"
        onPointerDown={onPointerDown}
        onDoubleClick={() => setAskHeight(ASK_AI_DEFAULT_HEIGHT)}
        className={cn(
          "group relative h-2 shrink-0 flex items-center justify-center bg-ink-800 border-y border-ink-700 transition-colors",
          collapsed ? "cursor-default" : "cursor-row-resize hover:bg-counsel-500/20",
          dragging && "bg-counsel-500/30",
        )}
      >
        <GripHorizontal
          className={cn(
            "h-3 w-3 text-ink-500 transition-colors pointer-events-none",
            !collapsed && "group-hover:text-counsel-300",
            dragging && "text-counsel-200",
          )}
        />
      </div>

      <div
        style={{ height: `${effectiveHeight}px` }}
        className="shrink-0 overflow-hidden border-t border-ink-700/60"
      >
        <AskAiChat
          contractId={contractId}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onExpand={expandToFill}
        />
      </div>
    </div>
  );
}

interface AnalysisPaneProps {
  contractId: string;
  summary: WorkspaceSummary;
  clauses: ClauseWorkspaceItem[];
  // Full, unfiltered clause list — the Authorities tab aggregates citations
  // across the whole contract, not just the filtered/visible clauses.
  allClauses: ClauseWorkspaceItem[];
  documentAnalysis?: DocumentAnalysisView | null;
  filter: FilterLevel;
  setFilter: (f: FilterLevel) => void;
  activeClauseId: string | null;
  setActiveClauseId: (id: string | null) => void;
  clauseStates: Record<string, ClauseActionState>;
  clauseEdits: Record<string, ClauseEdit>;
  setClauseAction: (
    id: string,
    next: Exclude<ClauseActionState, "pending">,
    opts?: { modifiedText?: string },
  ) => Promise<boolean>;
  resetClauseAction: (id: string) => Promise<void>;
  acceptAllStandard: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  resolvedCount: number;
  toast: (m: string, t?: "success" | "info") => void;
}

function AnalysisPane({
  contractId,
  summary,
  clauses,
  allClauses,
  documentAnalysis,
  filter,
  setFilter,
  activeClauseId,
  setActiveClauseId,
  clauseStates,
  clauseEdits,
  setClauseAction,
  resetClauseAction,
  acceptAllStandard,
  onExport,
  resolvedCount,
  toast,
}: AnalysisPaneProps) {
  const [view, setView] = useState<"analysis" | "authorities">("analysis");
  const citationCount = useMemo(
    () => allClauses.reduce((n, c) => n + c.citations.length, 0),
    [allClauses],
  );

  return (
    <div className="h-full flex flex-col bg-ink-900 min-h-0">
      <header className="px-5 pt-5 pb-3 border-b border-ink-700 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-ink-850 border border-ink-700 p-0.5">
            <PaneTab active={view === "analysis"} onClick={() => setView("analysis")}>
              Analysis
            </PaneTab>
            <PaneTab
              active={view === "authorities"}
              onClick={() => setView("authorities")}
            >
              Authorities{citationCount > 0 ? ` (${citationCount})` : ""}
            </PaneTab>
          </div>
          <span className="text-[12px] text-ink-500 truncate">
            {resolvedCount} of {summary.totalClauses} resolved
          </span>
        </div>
        {view === "analysis" && (
          <FilterRow filter={filter} setFilter={setFilter} summary={summary} />
        )}
      </header>

      <div className="flex-1 overflow-y-auto dark-scrollbar">
        {view === "authorities" ? (
          <CitationsPane
            clauses={allClauses}
            activeClauseId={activeClauseId}
            onJumpToClause={(id) => {
              setActiveClauseId(id);
              setView("analysis");
            }}
          />
        ) : (
          <div className="px-5 py-4">
            <SummaryCard
              summary={summary}
              acceptAllStandard={acceptAllStandard}
              resolvedCount={resolvedCount}
              onExport={onExport}
            />

            {documentAnalysis && <DocumentReviewCard analysis={documentAnalysis} />}

            <div className="mt-4">
              {clauses.length === 0 ? (
                <p className="text-center text-sm text-ink-500 py-8">
                  No clauses match this filter.
                </p>
              ) : (
                clauses.map((c) => (
                  <ClauseCard
                    key={c.id}
                    contractId={contractId}
                    clause={c}
                    isActive={activeClauseId === c.id}
                    onToggle={() =>
                      setActiveClauseId(activeClauseId === c.id ? null : c.id)
                    }
                    state={clauseStates[c.id] ?? "pending"}
                    edit={clauseEdits[c.id] ?? EMPTY_EDIT}
                    setClauseAction={setClauseAction}
                    resetClauseAction={resetClauseAction}
                    toast={toast}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaneTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors",
        active
          ? "bg-counsel-500/15 text-counsel-200"
          : "text-ink-500 hover:text-ink-300",
      )}
    >
      {children}
    </button>
  );
}

function FilterRow({
  filter,
  setFilter,
  summary,
}: {
  filter: FilterLevel;
  setFilter: (f: FilterLevel) => void;
  summary: WorkspaceSummary;
}) {
  const tabs: Array<{ key: FilterLevel; label: string; count: number }> = [
    { key: "all", label: "All", count: summary.totalClauses },
    { key: "high", label: "High", count: summary.high },
    { key: "medium", label: "Medium", count: summary.medium },
    {
      key: "standard",
      label: "Standard",
      count: summary.standard + summary.low,
    },
    { key: "missing", label: "Missing", count: summary.missing },
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto dark-scrollbar -mx-1 px-1">
      {tabs.map((t) => {
        if (t.key !== "all" && t.count === 0) return null;
        const active = filter === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "text-xs px-3 py-1 rounded-full transition-colors whitespace-nowrap",
              active
                ? "bg-counsel-500/15 text-counsel-200"
                : "bg-ink-850 text-ink-500 hover:text-ink-300",
            )}
          >
            {t.label} ({t.count})
          </button>
        );
      })}
    </div>
  );
}

// Whole-document analysis surface (Phase 1): executive summary, detected type,
// missing protections, cross-clause issues, one-sided terms. This is the
// document-level intelligence a clause-by-clause list cannot show.
function DocumentReviewCard({ analysis }: { analysis: DocumentAnalysisView }) {
  const [open, setOpen] = useState(true);
  const posture = POSTURE_META[analysis.overallPosture];
  const missing = analysis.missingProtections ?? [];
  const cross = analysis.crossClauseIssues ?? [];
  const oneSided = analysis.oneSidedTerms ?? [];
  const totalFindings = missing.length + cross.length + oneSided.length;

  return (
    <div className="mt-4 bg-counsel-500/5 border border-counsel-500/20 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Gavel className="h-4 w-4 text-counsel-400 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-ink-100">
                Document Review
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium",
                  posture.tone,
                )}
              >
                {posture.label}
              </span>
            </div>
            <p className="text-[11.5px] text-ink-500 mt-0.5 truncate">
              {analysis.contractTypeLabel} · {totalFindings} document-level
              finding{totalFindings === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ink-500 transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {analysis.executiveSummary && (
                <p className="text-[13px] leading-relaxed text-ink-300">
                  {analysis.executiveSummary}
                </p>
              )}

              {missing.length > 0 && (
                <DocFindingGroup
                  title={`Missing protections (${missing.length})`}
                  items={missing.map((m) => ({
                    level: m.riskLevel,
                    heading: m.label,
                    body: m.rationale,
                    extraLabel: m.suggestedClause ? "Suggested clause" : null,
                    extra: m.suggestedClause || null,
                  }))}
                />
              )}

              {cross.length > 0 && (
                <DocFindingGroup
                  title={`Cross-clause issues (${cross.length})`}
                  items={cross.map((c) => ({
                    level: c.riskLevel,
                    heading:
                      c.title +
                      (c.clausePositions.length
                        ? ` (§${c.clausePositions.join(", §")})`
                        : ""),
                    body: c.explanation,
                    extraLabel: c.recommendation ? "Recommendation" : null,
                    extra: c.recommendation || null,
                  }))}
                />
              )}

              {oneSided.length > 0 && (
                <DocFindingGroup
                  title={`One-sided terms (${oneSided.length})`}
                  items={oneSided.map((o) => ({
                    level: o.riskLevel,
                    heading:
                      o.title +
                      (o.clausePosition != null ? ` (§${o.clausePosition})` : ""),
                    body: o.explanation,
                    extraLabel: o.recommendation ? "Recommendation" : null,
                    extra: o.recommendation || null,
                  }))}
                />
              )}

              {totalFindings === 0 && (
                <p className="text-[12.5px] text-ink-400">
                  No document-level issues detected — standard protections appear
                  present and no cross-clause conflicts were found.
                </p>
              )}

              {analysis.degraded && (
                <p className="text-[11px] text-ink-500 italic">
                  Checklist-based analysis only (AI document pass unavailable).
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DocFindingGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{
    level: RiskLevel;
    heading: string;
    body: string;
    extraLabel: string | null;
    extra: string | null;
  }>;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-500 mb-2 font-medium">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg bg-ink-850/60 border border-ink-700/60 px-3 py-2.5",
              ACCENT_BORDER[it.level],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink-100">
                {it.heading}
              </span>
              <RiskBadge level={it.level} />
            </div>
            <p className="text-[12.5px] text-ink-300 mt-1 leading-relaxed">
              {stripCiteTokens(it.body) || it.body}
            </p>
            {it.extra && (
              <div className="mt-2 rounded bg-ink-950/60 border border-ink-700/60 px-2.5 py-1.5">
                {it.extraLabel && (
                  <div className="text-[9.5px] uppercase tracking-wider text-ink-500 mb-0.5">
                    {it.extraLabel}
                  </div>
                )}
                <p className="text-[12px] text-ink-200 leading-relaxed">
                  {stripCiteTokens(it.extra) || it.extra}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  summary,
  acceptAllStandard,
  resolvedCount,
  onExport,
}: {
  summary: WorkspaceSummary;
  acceptAllStandard: () => void;
  resolvedCount: number;
  onExport: (format: ExportFormat) => Promise<void>;
}) {
  const score = summary.overallRiskScore;
  const stdCount = summary.standard + summary.low;
  const reviewPct =
    summary.totalClauses > 0
      ? Math.round((resolvedCount / summary.totalClauses) * 100)
      : 0;
  const escalate =
    summary.high >= 3 || (summary.high >= 1 && summary.medium >= 4);
  const escalationReason = escalate
    ? `${summary.high} high-risk ${summary.high === 1 ? "clause" : "clauses"}${
        summary.medium > 0 ? ` and ${summary.medium} medium-risk` : ""
      } detected; recommend external counsel review`
    : null;

  const scoreColor =
    score < 40 ? "bg-risk-high" : score < 70 ? "bg-risk-med" : "bg-risk-low";

  return (
    <div className="bg-counsel-500/5 border border-counsel-500/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-counsel-300 font-medium">
          Review Summary
        </span>
        <span className="text-[11px] text-ink-500">v1</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {summary.high > 0 && (
          <Pill tone="high">{summary.high} High</Pill>
        )}
        {summary.medium > 0 && (
          <Pill tone="med">{summary.medium} Medium</Pill>
        )}
        {stdCount > 0 && <Pill tone="low">{stdCount} Standard</Pill>}
        {summary.missing > 0 && (
          <Pill tone="info">{summary.missing} Missing</Pill>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[13px] text-ink-300">Overall risk score</span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink-100">
            {score}
            <span className="text-ink-500 text-sm">/100</span>
          </span>
        </div>
        <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", scoreColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[13px] text-ink-300">Review progress</span>
          <span className="text-[12px] text-ink-400 font-[family-name:var(--font-mono)]">
            {resolvedCount}/{summary.totalClauses}
          </span>
        </div>
        <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-counsel-500 transition-all"
            style={{ width: `${reviewPct}%` }}
          />
        </div>
      </div>

      {escalate && escalationReason && (
        <div className="flex items-start gap-2.5 bg-risk-med/8 border border-risk-med/20 rounded-lg p-3">
          <Zap className="h-4 w-4 text-risk-med shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-risk-med">
              Recommendation: Escalate to senior counsel
            </p>
            <p className="text-[12.5px] text-ink-300 mt-1 leading-relaxed">
              {escalationReason}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={acceptAllStandard}
          className="inline-flex items-center gap-1.5 bg-risk-low/10 hover:bg-risk-low/20 text-risk-low text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Accept all standard ✓
        </button>
        <button
          type="button"
          onClick={() => void onExport("summary")}
          className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-[13px] px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export summary
        </button>
      </div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "high" | "med" | "low" | "info";
  children: React.ReactNode;
}) {
  const map = {
    high: "bg-risk-high/15 text-risk-high",
    med: "bg-risk-med/15 text-risk-med",
    low: "bg-risk-low/15 text-risk-low",
    info: "bg-risk-info/15 text-risk-info",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

function ClauseCard({
  contractId,
  clause,
  isActive,
  onToggle,
  state,
  edit,
  setClauseAction,
  resetClauseAction,
  toast,
}: {
  contractId: string;
  clause: ClauseWorkspaceItem;
  isActive: boolean;
  onToggle: () => void;
  state: ClauseActionState;
  edit?: ClauseEdit;
  setClauseAction: (
    id: string,
    next: Exclude<ClauseActionState, "pending">,
    opts?: { modifiedText?: string },
  ) => Promise<boolean>;
  resetClauseAction: (id: string) => Promise<void>;
  toast: (m: string, t?: "success" | "info") => void;
}) {
  const risk = clause.risk;
  const level: RiskLevel = risk?.level ?? "standard";
  const cls = clause.classification;

  if (state === "accepted") {
    return (
      <AcceptedView
        clause={clause}
        onReopen={() => {
          void resetClauseAction(clause.id);
          toast("Restored clause for re-review");
        }}
      />
    );
  }

  return (
    <article
      id={`card-clause-${clause.id}`}
      role="button"
      tabIndex={0}
      aria-expanded={isActive}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "bg-ink-850 border border-ink-700 rounded-xl p-4 mb-3 cursor-pointer transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-counsel-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
        ACCENT_BORDER[level],
        "hover:border-ink-500",
        isActive && "border-counsel-500/50 ring-1 ring-counsel-500/30",
        state === "rejected" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 shrink-0">
            §{clause.position}
          </span>
          <h3 className="text-[14px] font-medium text-ink-100 truncate">
            {clause.sectionTitle ||
              (cls ? CATEGORY_LABELS[cls.category] : "Clause")}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state === "modified" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wider font-medium bg-counsel-500/15 text-counsel-200">
              Edited
            </span>
          )}
          {state === "rejected" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wider font-medium bg-ink-700 text-ink-400">
              Rejected
            </span>
          )}
          {risk && <RiskBadge level={risk.level} />}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-500 transition-transform",
              isActive && "rotate-180",
            )}
          />
        </div>
      </div>

      <p className="text-[13px] text-ink-300 mt-2 leading-relaxed line-clamp-2">
        {risk?.issue || stripCiteTokens(clause.text)}
      </p>

      {risk && risk.confidence !== null && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-ink-500">
            Confidence
          </span>
          <ConfidenceChip confidence={risk.confidence} />
        </div>
      )}

      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ExpandedSections
              contractId={contractId}
              clause={clause}
              state={state}
              edit={edit}
              setClauseAction={setClauseAction}
              resetClauseAction={resetClauseAction}
              toast={toast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ExpandedSections({
  clause,
  state,
  edit,
  setClauseAction,
  resetClauseAction,
  toast,
}: {
  contractId: string;
  clause: ClauseWorkspaceItem;
  state: ClauseActionState;
  edit?: ClauseEdit;
  setClauseAction: (
    id: string,
    next: Exclude<ClauseActionState, "pending">,
    opts?: { modifiedText?: string },
  ) => Promise<boolean>;
  resetClauseAction: (id: string) => Promise<void>;
  toast: (m: string, t?: "success" | "info") => void;
}) {
  const risk = clause.risk;
  const hasRedline = Boolean(risk?.suggestion);
  const isStandard = !risk || risk.level === "low" || risk.level === "standard";
  const saving = edit?.saving ?? false;
  const error = edit?.error ?? null;
  const suggestionText = stripCiteTokens(risk?.suggestion ?? null);
  const modifiedText = edit?.modifiedText ?? null;

  const [editing, setEditing] = useState(false);

  return (
    <div className="mt-4 pt-4 border-t border-ink-700/60 space-y-4">
      {!isStandard && risk && risk.ruleIds.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-counsel-500/25 bg-counsel-500/5 px-3 py-2">
          <Gavel className="h-3.5 w-3.5 shrink-0 text-counsel-400 mt-0.5" />
          <div className="text-[12.5px] leading-relaxed text-ink-200">
            <span className="font-medium text-counsel-200">
              Deviates from your playbook
            </span>{" "}
            — flagged by{" "}
            {risk.ruleIds.slice(0, 3).map((rid, i) => (
              <span key={rid}>
                {i > 0 ? ", " : ""}
                <span className="font-[family-name:var(--font-mono)] text-[11.5px] text-counsel-200">
                  {rid}
                </span>
              </span>
            ))}
            {risk.ruleIds.length > 3 ? ` +${risk.ruleIds.length - 3} more` : ""}.
          </div>
        </div>
      )}

      {!isStandard && risk?.explanation && (
        <Section label="Why this matters">
          <p className="text-[13px] leading-relaxed text-ink-300">
            {stripCiteTokens(risk.explanation)}
          </p>
        </Section>
      )}

      {isStandard && (
        <Section label="Why this is fine">
          <p className="text-[13px] leading-relaxed text-ink-300">
            This clause is consistent with common market-standard drafting and
            our review playbook — no high- or medium-risk issues detected. No
            changes recommended.
          </p>
        </Section>
      )}

      {hasRedline && risk?.suggestion && (
        <Section label="Suggested redline">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded bg-ink-950/70 border border-ink-700/60 px-3 py-2">
              <div className="text-[9.5px] uppercase tracking-wider text-ink-500 mb-1">
                Original
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-400 line-through decoration-risk-high/40">
                {stripCiteTokens(clause.text)}
              </p>
            </div>
            <div className="rounded bg-risk-low/5 border border-risk-low/20 px-3 py-2">
              <div className="text-[9.5px] uppercase tracking-wider text-risk-low/80 mb-1">
                Suggested
              </div>
              <p className="text-[13px] leading-relaxed text-ink-100">
                {suggestionText}
              </p>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-500">
            Preview is clause-level; the exported Word doc applies word-level
            tracked changes into your original document.
          </p>
        </Section>
      )}

      {state === "modified" && modifiedText && !editing && (
        <Section label="Your edited redline">
          <div className="rounded bg-counsel-500/5 border border-counsel-500/20 px-3 py-2">
            <p className="text-[13px] text-ink-100 leading-relaxed whitespace-pre-wrap">
              {modifiedText}
            </p>
          </div>
        </Section>
      )}

      {clause.citations.length > 0 && (
        <Section label="Legal basis">
          <div className="flex flex-wrap gap-1.5">
            {clause.citations.map((c) => (
              <CitationPill key={c.id} citation={c} />
            ))}
          </div>
        </Section>
      )}

      {editing ? (
        <RedlineEditor
          clausePosition={clause.position}
          initialText={modifiedText || suggestionText || stripCiteTokens(clause.text)}
          saving={saving}
          error={error}
          onSave={(text) => {
            void setClauseAction(clause.id, "modified", { modifiedText: text }).then(
              (ok) => {
                if (ok) {
                  setEditing(false);
                  toast(`Edit saved for §${clause.position}`, "success");
                }
              },
            );
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasRedline && (
              <button
                type="button"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  void setClauseAction(clause.id, "accepted").then((ok) => {
                    if (ok) toast(`Redline accepted for §${clause.position}`, "success");
                  });
                }}
                className="inline-flex items-center gap-1.5 bg-risk-low/15 hover:bg-risk-low/25 text-risk-low text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Accept redline
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="inline-flex items-center gap-1.5 border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100 text-[13px] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <PenLine className="h-3.5 w-3.5" />
              {state === "modified" ? "Edit redline" : "Modify"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation();
                void setClauseAction(clause.id, "rejected").then((ok) => {
                  if (ok) toast(`Suggestion rejected for §${clause.position}`);
                });
              }}
              className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-300 text-[13px] px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
            {(state === "modified" || state === "rejected") && (
              <button
                type="button"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  void resetClauseAction(clause.id);
                  toast(`Reset §${clause.position} for re-review`);
                }}
                className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-300 text-[13px] px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const prompt = `Tell me more about §${clause.position}${
                  risk?.issue ? ` — ${risk.issue}` : ""
                }`;
                window.dispatchEvent(
                  new CustomEvent("clauseium:ask-ai", { detail: prompt }),
                );
              }}
              className="inline-flex items-center gap-1.5 text-counsel-400 hover:text-counsel-300 text-[13px] px-2 py-1.5 rounded-lg transition-colors ml-auto"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[12px] text-risk-high">
              {error}
            </p>
          )}

          {state === "rejected" && (
            <p className="text-[12px] text-ink-500 italic">
              Suggestion rejected — original clause text retained.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-500 mb-2 font-medium">
        — {label} —
      </div>
      {children}
    </div>
  );
}

function AcceptedView({
  clause,
  onReopen,
}: {
  clause: ClauseWorkspaceItem;
  onReopen: () => void;
}) {
  const cls = clause.classification;
  return (
    <article
      id={`card-clause-${clause.id}`}
      onClick={onReopen}
      className="bg-risk-low/5 border border-risk-low/20 rounded-xl px-4 py-3 mb-3 opacity-90 cursor-pointer hover:opacity-100 transition-opacity flex items-center gap-3"
    >
      <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-ink-500 shrink-0">
            §{clause.position}
          </span>
          <span className="text-[13px] font-medium text-ink-100 truncate">
            {clause.sectionTitle ||
              (cls ? CATEGORY_LABELS[cls.category] : "Clause")}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-risk-low ml-auto shrink-0">
            Accepted
          </span>
        </div>
        <p className="text-[12px] text-ink-500 mt-0.5 truncate">
          Redline applied · {clause.risk?.issue ?? "Reviewed"}
        </p>
      </div>
    </article>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const b = RISK_BADGE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
        b.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", b.dot)} />
      {b.label}
    </span>
  );
}

// Qualitative confidence only — CLAUDE.md AI-UX rule: never show raw % (spurious
// precision). Neutral tones, since risk colors (green/amber/red) already mean risk.
function ConfidenceChip({ confidence }: { confidence: number }) {
  const label =
    confidence >= 0.75 ? "High" : confidence >= 0.45 ? "Medium" : "Low";
  return (
    <span className="inline-flex items-center rounded-full border border-ink-700 bg-ink-800/60 px-2 py-0.5 text-[11px] font-medium text-ink-200">
      {label}
    </span>
  );
}

function CitationPill({ citation }: { citation: LegalCitation }) {
  const tone = CITATION_TONES[citation.status];
  const label = CITATION_LABELS[citation.status];
  const sectionStripped = citation.section.replace(/^section\s+/i, "").trim();
  const display = sectionStripped
    ? `${citation.source} § ${sectionStripped}`
    : citation.source;
  const linkable =
    citation.url &&
    !/^https?:\/\/(www\.)?indiacode\.nic\.in\/handle\//i.test(citation.url);
  if (linkable) {
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

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto bg-ink-800 border border-ink-700 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-2 max-w-sm"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-risk-info shrink-0" />
            )}
            <span className="text-[13px] text-ink-100">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Banner rendered when the contract is processing or failed (above the panes).
// Polls the status endpoint and auto-advances the page when analysis is ready —
// no more "reload to check again".
export function StatusBanner({
  contractId,
  status,
  errorMessage,
}: {
  contractId: string;
  status: "queued" | "processing" | "failed";
  errorMessage: string | null;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (): Promise<void> => {
    setChecking(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/status`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { status?: string };
        // "ready" or "failed" both warrant a re-render of the server component.
        if (data.status === "ready" || data.status === "failed") {
          router.refresh();
        }
      }
    } catch {
      /* transient network error — the next tick will retry */
    } finally {
      setChecking(false);
    }
  }, [contractId, router]);

  // Poll while queued/processing; stop once failed (the page will re-render).
  useEffect(() => {
    if (status === "failed") return;
    const id = setInterval(() => void check(), 3500);
    return () => clearInterval(id);
  }, [status, check]);

  if (status === "failed") {
    return (
      <div className="rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 flex items-start gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-risk-high mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium text-risk-high">
            Processing failed
          </div>
          {errorMessage && (
            <p className="text-xs text-ink-300 mt-1 font-[family-name:var(--font-mono)] break-all">
              {errorMessage}
            </p>
          )}
          <Link
            href="/dashboard"
            className="mt-3 inline-flex items-center rounded-lg border border-ink-700 px-3 py-1.5 text-[13px] font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-white"
          >
            Back to contracts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-6 flex items-start gap-3 mb-4">
      <Gavel className="h-5 w-5 text-counsel-400 animate-pulse shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-100">
          {status === "queued" ? "Waiting in queue…" : "Analyzing your contract…"}
        </div>
        <p className="text-xs text-ink-400 mt-1">
          Parsing structure · classifying clauses · checking Indian statutes ·
          drafting redlines
        </p>
        <p className="text-[11px] text-ink-600 mt-1">
          This page updates automatically — no need to reload.
        </p>
        <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-ink-700">
          <div className="h-full w-1/3 rounded-full bg-counsel-500 animate-[indeterminate_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => void check()}
        disabled={checking}
        className="shrink-0 rounded-lg border border-ink-700 px-3 py-1.5 text-[13px] font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-white disabled:opacity-50"
      >
        {checking ? "Checking…" : "Check now"}
      </button>
    </div>
  );
}

