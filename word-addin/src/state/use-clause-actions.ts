import { useCallback, useEffect, useState } from "react";
import {
  clearClauseAction,
  listClauseActions,
  setClauseAction,
} from "@addin/api/clause-actions";
import type { ClauseActionState } from "@addin/types/contract";

// Hook that holds and mutates the per-user clause decisions for a contract.
// Hydrates once on mount (so re-opening a previously-reviewed document
// remembers which clauses you accepted/rejected), then writes-through
// optimistically on every mutation.

export interface ClauseActionsApi {
  states: Record<string, ClauseActionState>;
  isLoading: boolean;
  // Returns the previous state for optimistic revert in the caller.
  setAction: (
    clauseId: string,
    next: Exclude<ClauseActionState, "pending">,
  ) => Promise<void>;
  clearAction: (clauseId: string) => Promise<void>;
}

export interface UseClauseActionsInput {
  contractId: string | null;
  getAccessToken: () => Promise<string | null>;
}

export function useClauseActions({
  contractId,
  getAccessToken,
}: UseClauseActionsInput): ClauseActionsApi {
  const [states, setStates] = useState<Record<string, ClauseActionState>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    let active = true;
    setIsLoading(true);
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token || !active) return;
        const actions = await listClauseActions(contractId, token);
        if (!active) return;
        const next: Record<string, ClauseActionState> = {};
        for (const a of actions) next[a.clause_id] = a.state;
        setStates(next);
      } catch (err) {
        console.warn(
          `[clause-actions] hydrate failed: ${
            err instanceof Error ? err.message : err
          }`,
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [contractId, getAccessToken]);

  const setAction = useCallback(
    async (
      clauseId: string,
      next: Exclude<ClauseActionState, "pending">,
    ) => {
      if (!contractId) return;
      // Capture the previous value via the functional setter so the
      // callback identity doesn't depend on `states` (which would re-fire
      // every render). Optimistic update lands immediately.
      let prev: ClauseActionState = "pending";
      setStates((s) => {
        prev = s[clauseId] ?? "pending";
        return { ...s, [clauseId]: next };
      });
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Session expired");
        await setClauseAction(contractId, clauseId, next, token);
      } catch (err) {
        // Revert on failure.
        setStates((s) => ({ ...s, [clauseId]: prev }));
        console.warn(
          `[clause-actions] setAction failed clause=${clauseId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
        throw err;
      }
    },
    [contractId, getAccessToken],
  );

  const clearAction = useCallback(
    async (clauseId: string) => {
      if (!contractId) return;
      let prev: ClauseActionState = "pending";
      setStates((s) => {
        prev = s[clauseId] ?? "pending";
        const copy = { ...s };
        delete copy[clauseId];
        return copy;
      });
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Session expired");
        await clearClauseAction(contractId, clauseId, token);
      } catch (err) {
        setStates((s) => ({ ...s, [clauseId]: prev }));
        console.warn(
          `[clause-actions] clearAction failed clause=${clauseId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
        throw err;
      }
    },
    [contractId, getAccessToken],
  );

  return { states, isLoading, setAction, clearAction };
}
