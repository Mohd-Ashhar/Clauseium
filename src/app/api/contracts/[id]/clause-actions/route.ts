import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedContext } from "@/lib/auth/get-authed-context";

export const runtime = "nodejs";

// State the user can place a clause into. "pending" is the absence of a row
// (no decision yet), so the API only accepts the three explicit terminal
// states. To reset back to "pending", DELETE the row.
const STATE_VALUES = ["accepted", "modified", "rejected"] as const;

const upsertSchema = z.object({
  clause_id: z.string().uuid(),
  state: z.enum(STATE_VALUES),
  note: z.string().max(2000).optional(),
  // Reviewer-edited redline wording (the "Modify" workflow). Persisted to
  // clause_actions.modified_text (migration 0010) and used verbatim by the
  // export engines. Only meaningful when state === "modified".
  modified_text: z.string().max(20000).optional(),
});

const deleteSchema = z.object({
  clause_id: z.string().uuid(),
});

interface ActionRow {
  clause_id: string;
  state: (typeof STATE_VALUES)[number];
  note: string | null;
  modified_text: string | null;
  updated_at: string;
}

// Postgres "undefined_column" — thrown when migration 0010 (modified_text) has
// not been applied yet. We degrade gracefully so the existing accept/reject
// flow keeps working before the migration runs (mirrors persist.ts /
// document-persist.ts which swallow 42703 to stay migration-tolerant).
const UNDEFINED_COLUMN = "42703";

// GET: list all clause-action rows for the current user against the given
// contract. Filters via an inner-join on clauses.contract_id; RLS confines
// the result to rows the user owns.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { user, supabase } = ctx;

  const { id: contractId } = await params;

  // Confirm the contract belongs to the caller before doing the join lookup.
  // RLS on contracts also enforces this; this is a fast pre-check that gives
  // us a clean 404 instead of an empty list.
  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .maybeSingle();

  if (contractErr) {
    return NextResponse.json(
      { error: "query_failed", message: contractErr.message },
      { status: 500 },
    );
  }
  if (!contract) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Two-step: list clause ids for the contract, then fetch action rows for
  // those ids owned by the user. Avoids relying on PostgREST embedded joins
  // (which require named FK relationships).
  const { data: clauseRows, error: clausesErr } = await supabase
    .from("clauses")
    .select("id")
    .eq("contract_id", contractId);

  if (clausesErr) {
    return NextResponse.json(
      { error: "clauses_query_failed", message: clausesErr.message },
      { status: 500 },
    );
  }

  const clauseIds = (clauseRows ?? []).map((r) => r.id as string);
  if (clauseIds.length === 0) {
    return NextResponse.json({ actions: [] }, { status: 200 });
  }

  const primaryActions = await supabase
    .from("clause_actions")
    .select("clause_id, state, note, modified_text, updated_at")
    .eq("owner_user_id", user.id)
    .in("clause_id", clauseIds);

  let rawActions: Array<Record<string, unknown>>;
  let actionErr = primaryActions.error;
  if (actionErr?.code === UNDEFINED_COLUMN) {
    // 0010 not applied — re-select without modified_text.
    const fallback = await supabase
      .from("clause_actions")
      .select("clause_id, state, note, updated_at")
      .eq("owner_user_id", user.id)
      .in("clause_id", clauseIds);
    rawActions = (fallback.data ?? []) as Array<Record<string, unknown>>;
    actionErr = fallback.error;
  } else {
    rawActions = (primaryActions.data ?? []) as Array<Record<string, unknown>>;
  }

  if (actionErr) {
    return NextResponse.json(
      { error: "actions_query_failed", message: actionErr.message },
      { status: 500 },
    );
  }

  const actions: ActionRow[] = rawActions.map((r) => ({
    clause_id: r.clause_id as string,
    state: r.state as (typeof STATE_VALUES)[number],
    note: (r.note as string | null) ?? null,
    modified_text:
      "modified_text" in r ? ((r.modified_text as string | null) ?? null) : null,
    updated_at: r.updated_at as string,
  }));

  return NextResponse.json({ actions }, { status: 200 });
}

// PUT: idempotent upsert of a single clause action. Body
//   { clause_id, state, note?, modified_text? }
// State must be one of accepted/modified/rejected. modified_text holds the
// reviewer's edited redline and is only persisted when state === "modified"
// (cleared to null otherwise so an accepted/rejected row never carries stale
// edits). To clear a decision, call DELETE instead. RLS chains through the
// clauses → contracts owner.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { user, supabase } = ctx;

  const { id: contractId } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Confirm clause belongs to the contract (and contract to the user).
  const { data: clause, error: clauseErr } = await supabase
    .from("clauses")
    .select("id, contract_id")
    .eq("id", parsed.data.clause_id)
    .maybeSingle();

  if (clauseErr) {
    return NextResponse.json(
      { error: "query_failed", message: clauseErr.message },
      { status: 500 },
    );
  }
  if (!clause || clause.contract_id !== contractId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const baseRow = {
    clause_id: parsed.data.clause_id,
    owner_user_id: user.id,
    state: parsed.data.state,
    note: parsed.data.note ?? null,
  };
  // Only the "modified" state carries edited text; clear it for accept/reject.
  const modifiedText =
    parsed.data.state === "modified" ? parsed.data.modified_text ?? null : null;

  const primaryUpsert = await supabase
    .from("clause_actions")
    .upsert(
      { ...baseRow, modified_text: modifiedText },
      { onConflict: "clause_id,owner_user_id" },
    )
    .select("clause_id, state, note, modified_text, updated_at")
    .single();

  let data: Record<string, unknown> | null =
    primaryUpsert.data as Record<string, unknown> | null;
  let error = primaryUpsert.error;

  if (error?.code === UNDEFINED_COLUMN) {
    // 0010 not applied — persist without modified_text so accept/reject (and a
    // best-effort modify) still work. The edited text is lost until 0010 runs.
    const fallbackUpsert = await supabase
      .from("clause_actions")
      .upsert(baseRow, { onConflict: "clause_id,owner_user_id" })
      .select("clause_id, state, note, updated_at")
      .single();
    data = fallbackUpsert.data as Record<string, unknown> | null;
    error = fallbackUpsert.error;
  }

  if (error) {
    return NextResponse.json(
      { error: "upsert_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ action: data }, { status: 200 });
}

// DELETE: clear a clause action (resets to "pending"). Body: { clause_id }.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { user, supabase } = ctx;

  const { id: contractId } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Same contract-bound clause check as the upsert path.
  const { data: clause, error: clauseErr } = await supabase
    .from("clauses")
    .select("id, contract_id")
    .eq("id", parsed.data.clause_id)
    .maybeSingle();

  if (clauseErr) {
    return NextResponse.json(
      { error: "query_failed", message: clauseErr.message },
      { status: 500 },
    );
  }
  if (!clause || clause.contract_id !== contractId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("clause_actions")
    .delete()
    .eq("clause_id", parsed.data.clause_id)
    .eq("owner_user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "delete_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
