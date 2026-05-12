import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@addin/state/auth-context";
import { useContractStore } from "@addin/state/contract-store";
import { RISK_RANK } from "@addin/lib/constants";
import { ClauseCard } from "../components/ClauseCard";
import { ConsentDialog } from "../components/ConsentDialog";
import { EmptyState } from "../components/EmptyState";
import { FilterTabs, type FilterValue } from "../components/FilterTabs";
import { SummaryHeader } from "../components/SummaryHeader";
import { UploadProgress } from "../components/UploadProgress";
import type {
  AnalysisClause,
  ClauseActionState,
} from "@addin/types/contract";

// Auto-upload flow on first sign-in:
//   mount → useContractStore.start() →
//     read .docx → hash → by-hash check → (existing? load : consent → upload → poll → fetch)
//
// The ContractStore drives the entire data flow. This component is mostly
// presentational once analysis lands.
//
// Apply Redline / scroll-to-clause / chat are stubbed via local state in
// this chunk; Chunk B and C wire them to Word.js + the chat endpoint.

export function Workspace() {
  const { signOut, getAccessToken } = useAuth();
  const store = useContractStore({ getAccessToken });
  const { state, start, acceptConsent, declineConsent, retry } = store;

  const [filter, setFilter] = useState<FilterValue>("all");
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [clauseStates, setClauseStates] = useState<
    Record<string, ClauseActionState>
  >({});

  // Kick off the flow on first mount.
  useEffect(() => {
    start();
    // intentionally only run on mount — re-running would re-read the doc
    // and double-upload. The user can retry via the error UI's button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function setClauseState(id: string, next: ClauseActionState) {
    setClauseStates((prev) => ({ ...prev, [id]: next }));
  }

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
    <div className="flex flex-col h-full">
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
              const cState = clauseStates[clause.id] ?? "pending";
              const isActive = activeClauseId === clause.id;
              return (
                <li key={clause.id}>
                  <ClauseCard
                    clause={clause}
                    isActive={isActive}
                    state={cState}
                    onToggle={() =>
                      setActiveClauseId(isActive ? null : clause.id)
                    }
                    onAcceptRedline={() => setClauseState(clause.id, "accepted")}
                    onReject={() => setClauseState(clause.id, "rejected")}
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
    </div>
  );
}
