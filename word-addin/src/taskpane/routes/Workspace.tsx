import { CheckCircle2, FileText, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyRedline, scrollToClause } from "@addin/office/document-writer";
import { useAuth } from "@addin/state/auth-context";
import { useContractStore } from "@addin/state/contract-store";
import {
  loadTrackChangesConsent,
  saveTrackChangesConsent,
} from "@addin/state/track-changes-consent";
import { useClauseActions } from "@addin/state/use-clause-actions";
import { RISK_RANK } from "@addin/lib/constants";
import { ClauseCard } from "../components/ClauseCard";
import { ConsentDialog } from "../components/ConsentDialog";
import { EmptyState } from "../components/EmptyState";
import { FilterTabs, type FilterValue } from "../components/FilterTabs";
import { SummaryHeader } from "../components/SummaryHeader";
import { TrackChangesPrompt } from "../components/TrackChangesPrompt";
import { UploadProgress } from "../components/UploadProgress";
import type { AnalysisClause } from "@addin/types/contract";

// Auto-upload flow on first sign-in:
//   mount → useContractStore.start() →
//     read .docx → hash → by-hash check → (existing? load : consent → upload → poll → fetch)
//
// Once analysis lands (state.kind === "ready"):
//   - clause card click → scroll Word to that clause
//   - Accept redline → (one-time consent prompt) → applyRedline + persist
//   - Reject → persist clause action
//   - Existing decisions hydrate from /api/contracts/:id/clause-actions
//
// Ask-AI chat drawer is still Chunk C.

interface PendingRedline {
  clause: AnalysisClause;
  suggestion: string;
}

interface ToastState {
  id: number;
  text: string;
  tone: "success" | "info" | "error";
}

const TOAST_TIMEOUT_MS = 3500;

export function Workspace() {
  const { signOut, getAccessToken } = useAuth();
  const store = useContractStore({ getAccessToken });
  const { state, start, acceptConsent, declineConsent, retry } = store;
  const contractId = state.kind === "ready" ? state.contractId : null;

  const clauseActions = useClauseActions({ contractId, getAccessToken });

  const [filter, setFilter] = useState<FilterValue>("all");
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [pendingRedline, setPendingRedline] = useState<PendingRedline | null>(
    null,
  );
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);

  // Kick off the flow on first mount.
  useEffect(() => {
    start();
    // intentionally only run on mount — re-running would re-read the doc
    // and double-upload. The user can retry via the error UI's button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback(
    (text: string, tone: ToastState["tone"] = "info") => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, text, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_TIMEOUT_MS);
    },
    [],
  );

  const handleToggle = useCallback(
    (clause: AnalysisClause) => {
      const willOpen = activeClauseId !== clause.id;
      setActiveClauseId(willOpen ? clause.id : null);
      // Always try to scroll Word to the clicked clause — useful even when
      // collapsing the card (the user clicked it because they care).
      void scrollToClause(clause);
    },
    [activeClauseId],
  );

  const applyAndPersist = useCallback(
    async (
      clause: AnalysisClause,
      suggestion: string,
      trackChangesAccepted: boolean,
    ) => {
      const result = await applyRedline(clause, suggestion, {
        trackChangesAccepted,
      });
      if (result.kind === "not_found") {
        showToast(
          "Couldn't locate this clause in the document. It may have been edited.",
          "error",
        );
        return;
      }
      try {
        await clauseActions.setAction(clause.id, "accepted");
      } catch {
        showToast("Couldn't save your decision. Please try again.", "error");
        return;
      }
      if (result.kind === "applied") {
        showToast(
          `Redline applied as a tracked change in §${clause.position ?? "—"}.`,
          "success",
        );
      } else {
        showToast(
          "Redline copied to clipboard — paste it where you want it.",
          "info",
        );
      }
    },
    [clauseActions, showToast],
  );

  const handleAcceptRedline = useCallback(
    (clause: AnalysisClause) => {
      const suggestion = clause.risk?.suggestion?.trim() ?? "";
      if (!suggestion) {
        showToast("No suggested redline for this clause.", "info");
        return;
      }
      const consent = loadTrackChangesConsent();
      if (consent === "accepted") {
        void applyAndPersist(clause, suggestion, true);
        return;
      }
      if (consent === "clipboard_only") {
        void applyAndPersist(clause, suggestion, false);
        return;
      }
      // First time — show the prompt and remember what to apply when it resolves.
      setPendingRedline({ clause, suggestion });
    },
    [applyAndPersist, showToast],
  );

  const handleReject = useCallback(
    (clause: AnalysisClause) => {
      void (async () => {
        try {
          await clauseActions.setAction(clause.id, "rejected");
          showToast(
            `Rejected suggestion for §${clause.position ?? "—"}.`,
            "info",
          );
        } catch {
          showToast("Couldn't save your decision. Please try again.", "error");
        }
      })();
    },
    [clauseActions, showToast],
  );

  const closePrompt = useCallback(() => setPendingRedline(null), []);
  const handlePromptAccept = useCallback(() => {
    if (!pendingRedline) return;
    saveTrackChangesConsent("accepted");
    const { clause, suggestion } = pendingRedline;
    setPendingRedline(null);
    void applyAndPersist(clause, suggestion, true);
  }, [applyAndPersist, pendingRedline]);

  const handlePromptClipboard = useCallback(() => {
    if (!pendingRedline) return;
    saveTrackChangesConsent("clipboard_only");
    const { clause, suggestion } = pendingRedline;
    setPendingRedline(null);
    void applyAndPersist(clause, suggestion, false);
  }, [applyAndPersist, pendingRedline]);

  const analysis = state.analysis;
  const summary = analysis?.summary ?? null;

  const counts = useMemo<Record<FilterValue, number>>(() => {
    if (!analysis) {
      return { all: 0, high: 0, medium: 0, low: 0, standard: 0, missing: 0 };
    }
    return {
      all: analysis.clauses.length,
      high: analysis.summary.by_risk.high,
      medium: analysis.summary.by_risk.medium,
      low: analysis.summary.by_risk.low,
      standard: analysis.summary.by_risk.standard,
      missing: analysis.summary.by_risk.missing,
    };
  }, [analysis]);

  const filtered = useMemo(() => {
    if (!analysis) return [];
    const list =
      filter === "all"
        ? [...analysis.clauses]
        : analysis.clauses.filter((c) => c.risk?.level === filter);
    return list.sort((a, b) => {
      const ra = a.risk ? RISK_RANK[a.risk.level] : 5;
      const rb = b.risk ? RISK_RANK[b.risk.level] : 5;
      return ra - rb;
    });
  }, [analysis, filter]);

  const title = state.filename ?? "Open document";

  // Non-ready states: show progress UI (and consent overlay when needed).
  if (state.kind !== "ready" || !analysis) {
    return (
      <div className="relative flex flex-col h-full">
        <SummaryHeader title={title} summary={null} onSignOut={signOut} />
        <div className="flex-1 overflow-y-auto">
          <UploadProgress state={state} onRetry={retry} onSignOut={signOut} />
        </div>
        {state.kind === "consent_needed" && (
          <ConsentDialog
            filename={state.filename}
            bytes={state.bytes}
            onAccept={acceptConsent}
            onDecline={declineConsent}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      <SummaryHeader title={title} summary={summary} onSignOut={signOut} />
      <FilterTabs value={filter} onChange={setFilter} counts={counts} />
      <main className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" aria-hidden="true" />}
            title="No clauses match this filter"
            body="Switch to a different risk filter or pick All to see every clause."
          />
        ) : (
          <ul aria-label="Clause analysis">
            {filtered.map((clause: AnalysisClause) => {
              const cState = clauseActions.states[clause.id] ?? "pending";
              const isActive = activeClauseId === clause.id;
              return (
                <li key={clause.id}>
                  <ClauseCard
                    clause={clause}
                    isActive={isActive}
                    state={cState}
                    onToggle={() => handleToggle(clause)}
                    onAcceptRedline={() => handleAcceptRedline(clause)}
                    onReject={() => handleReject(clause)}
                    onAskAi={() => {
                      // Wired up in Chunk C (ChatDrawer).
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {pendingRedline && (
        <TrackChangesPrompt
          clauseLabel={`§${pendingRedline.clause.position ?? "—"}`}
          onAccept={handlePromptAccept}
          onClipboardOnly={handlePromptClipboard}
          onCancel={closePrompt}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

function ToastStack({ toasts }: { toasts: ToastState[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-col gap-1.5 z-20">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "pointer-events-auto rounded-md border px-3 py-2 text-[12px] leading-snug shadow-lg backdrop-blur " +
            (t.tone === "success"
              ? "bg-risk-low/15 border-risk-low/30 text-risk-low"
              : t.tone === "error"
                ? "bg-risk-high/15 border-risk-high/30 text-risk-high"
                : "bg-ink-800/95 border-ink-700 text-ink-100")
          }
        >
          <span className="inline-flex items-center gap-1.5">
            {t.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : t.tone === "error" ? (
              <X className="h-3.5 w-3.5 shrink-0" />
            ) : null}
            <span>{t.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
