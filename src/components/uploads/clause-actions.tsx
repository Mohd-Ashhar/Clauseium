"use client";

import { useEffect, useState } from "react";
import { Check, MessageSquare, PenLine, X } from "lucide-react";

export type ClauseActionState =
  | "pending"
  | "accepted"
  | "modified"
  | "rejected";

interface ClauseActionsProps {
  contractId: string;
  clauseId: string;
  clauseNumber: string | null;
  hasRedline: boolean;
  askPrompt: string;
  // Hydrate from server-rendered SSR fetch so the row's prior decision shows
  // immediately without a flash of "pending".
  initialState?: ClauseActionState;
  initialNote?: string | null;
}

export function ClauseActions({
  contractId,
  clauseId,
  clauseNumber,
  hasRedline,
  askPrompt,
  initialState = "pending",
  initialNote = null,
}: ClauseActionsProps) {
  const [state, setState] = useState<ClauseActionState>(initialState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track latest note locally so re-rendering doesn't lose it. Could be
  // surfaced in a future "Add reasoning" textarea; kept here as a hook.
  const [, setNote] = useState<string | null>(initialNote);

  useEffect(() => {
    if (!feedback) return;
    const handle = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(handle);
  }, [feedback]);

  const sectionLabel = clauseNumber ? `§${clauseNumber}` : "this clause";

  const apply = async (next: Exclude<ClauseActionState, "pending">) => {
    if (pending) return;
    setPending(true);
    setError(null);
    const prev = state;
    setState(next);
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/clause-actions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clause_id: clauseId, state: next }),
        },
      );
      if (!res.ok) {
        setState(prev);
        const body = await res.json().catch(() => ({}));
        setError(
          body && typeof body.message === "string"
            ? body.message
            : `Save failed (${res.status}).`,
        );
        return;
      }
      setFeedback(messageFor(next, sectionLabel));
    } catch (err) {
      setState(prev);
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setPending(false);
    }
  };

  const clear = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    const prev = state;
    setState("pending");
    setNote(null);
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/clause-actions`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clause_id: clauseId }),
        },
      );
      if (!res.ok) {
        setState(prev);
        const body = await res.json().catch(() => ({}));
        setError(
          body && typeof body.message === "string"
            ? body.message
            : `Reset failed (${res.status}).`,
        );
        return;
      }
      setFeedback(`Reset ${sectionLabel} to pending`);
    } catch (err) {
      setState(prev);
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setPending(false);
    }
  };

  const askAi = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("clauseium:ask-ai", { detail: askPrompt }),
    );
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        {hasRedline && (
          <button
            type="button"
            disabled={pending}
            onClick={() => apply("accepted")}
            className={btnClass(
              "bg-risk-low/15 hover:bg-risk-low/25 text-risk-low",
              state === "accepted",
            )}
          >
            <Check className="h-3 w-3" />
            {state === "accepted" ? "Accepted" : "Accept redline"}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => apply("modified")}
          className={btnClass(
            "border border-ink-700 hover:border-ink-500 text-ink-300 hover:text-ink-100",
            state === "modified",
          )}
        >
          <PenLine className="h-3 w-3" />
          {state === "modified" ? "Marked for edit" : "Modify"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => apply("rejected")}
          className={btnClass(
            "text-ink-500 hover:text-ink-300",
            state === "rejected",
          )}
        >
          <X className="h-3 w-3" />
          {state === "rejected" ? "Rejected" : "Reject"}
        </button>
        {state !== "pending" && (
          <button
            type="button"
            disabled={pending}
            onClick={clear}
            className="text-[11px] text-ink-500 hover:text-ink-300 underline-offset-2 hover:underline px-1 disabled:opacity-50"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={askAi}
          className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-[12px] px-2 py-1 rounded-md transition-colors ml-auto"
        >
          <MessageSquare className="h-3 w-3" />
          Ask AI
        </button>
      </div>
      {error ? (
        <p className="text-[11px] text-risk-high italic">{error}</p>
      ) : feedback ? (
        <p className="text-[11px] text-ink-400 italic">{feedback}</p>
      ) : state !== "pending" ? (
        <p className="text-[11px] text-ink-500 italic">
          {steadyStateLabel(state, sectionLabel)}
        </p>
      ) : null}
    </div>
  );
}

function btnClass(base: string, active: boolean): string {
  return `inline-flex items-center gap-1.5 ${base} text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 ${active ? "ring-1 ring-current/40" : ""}`;
}

function messageFor(
  state: Exclude<ClauseActionState, "pending">,
  sectionLabel: string,
): string {
  switch (state) {
    case "accepted":
      return `Redline accepted for ${sectionLabel}`;
    case "modified":
      return `${sectionLabel} marked for manual edit`;
    case "rejected":
      return `Suggestion rejected for ${sectionLabel}`;
  }
}

function steadyStateLabel(
  state: Exclude<ClauseActionState, "pending">,
  sectionLabel: string,
): string {
  switch (state) {
    case "accepted":
      return `Redline accepted for ${sectionLabel}.`;
    case "modified":
      return `Marked ${sectionLabel} for manual edit.`;
    case "rejected":
      return `Suggestion rejected for ${sectionLabel} — original retained.`;
  }
}
