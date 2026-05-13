import { apiFetch } from "./client";
import type { ClauseActionState } from "@addin/types/contract";

// Per-user accept / modify / reject decisions on individual clauses.
// Backed by /api/contracts/:id/clause-actions on the main app.
//   GET    → existing decisions for the contract
//   PUT    → upsert one decision
//   DELETE → clear one decision (back to "pending")
//
// Server-side RLS scopes everything to the calling user.

export interface ClauseAction {
  clause_id: string;
  state: Exclude<ClauseActionState, "pending">;
  note: string | null;
  updated_at: string;
}

export async function listClauseActions(
  contractId: string,
  accessToken: string,
): Promise<ClauseAction[]> {
  const response = await apiFetch(
    `/api/contracts/${contractId}/clause-actions`,
    { method: "GET" },
    accessToken,
  );
  const body = (await response.json()) as { actions: ClauseAction[] };
  return body.actions ?? [];
}

export async function setClauseAction(
  contractId: string,
  clauseId: string,
  state: Exclude<ClauseActionState, "pending">,
  accessToken: string,
  note?: string,
): Promise<ClauseAction> {
  const response = await apiFetch(
    `/api/contracts/${contractId}/clause-actions`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clause_id: clauseId, state, ...(note ? { note } : {}) }),
    },
    accessToken,
  );
  const body = (await response.json()) as { action: ClauseAction };
  return body.action;
}

export async function clearClauseAction(
  contractId: string,
  clauseId: string,
  accessToken: string,
): Promise<void> {
  await apiFetch(
    `/api/contracts/${contractId}/clause-actions`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clause_id: clauseId }),
    },
    accessToken,
  );
}
