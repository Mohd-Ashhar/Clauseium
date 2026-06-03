import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/auth/get-authed-context";

export const runtime = "nodejs";

// Tracks queued contracts we've already kicked off in this server process so
// the same poll-burst doesn't fire /process repeatedly while the orchestrator
// is mid-flight. The /process route is idempotent on its own, but skipping
// the redundant fetch keeps dev logs clean.
const kicked = new Set<string>();

// Debounce for STALE-PROCESSING reclaims. A reclaim re-runs the full pipeline,
// which can take minutes, so we must not re-fire while one is plausibly still
// in flight. Keyed by contract id; entry cleared after the window.
const reclaimed = new Set<string>();

// A contract is "stuck" when its analysis HEARTBEAT has gone silent for this
// long. The orchestrator bumps analysis_heartbeat_at as it works (start, after
// each stage, and throttled during the risk fan-out), so a healthy long run —
// even a slow 99-page contract — keeps a fresh heartbeat and is never reclaimed.
// Only a genuinely dead run (serverless timeout, worker recycle) lets the
// heartbeat go stale, and reclaiming it is then safe AND cheap: processContract
// resumes, re-billing only the clauses that were never analyzed. Pre-migration
// (no heartbeat column) we fall back to uploaded_at, preserving the old behaviour.
const STALE_PROCESSING_MS = 4 * 60 * 1000;
const RECLAIM_DEBOUNCE_MS = STALE_PROCESSING_MS;

const STATUS_COLS_FULL =
  "id, status, error_message, page_count, processed_at, uploaded_at, processing_started_at, analysis_heartbeat_at";
const STATUS_COLS_BASE =
  "id, status, error_message, page_count, processed_at, uploaded_at";
const UNDEFINED_COLUMN = "42703";

function kickProcess(
  req: Request,
  id: string,
  force: boolean,
): void {
  const secret = process.env.INTERNAL_PROCESSING_SECRET;
  if (!secret) {
    console.warn(
      `[status] contract ${id} needs (re)processing but INTERNAL_PROCESSING_SECRET is unset — cannot kick worker`,
    );
    return;
  }
  const baseUrl = process.env.INTERNAL_BASE_URL ?? new URL(req.url).origin;
  const url = `${baseUrl}/api/contracts/${id}/process${force ? "?force=1" : ""}`;
  void fetch(url, { method: "POST", headers: { "x-internal-secret": secret } })
    .catch((err) => {
      console.error(`[status] failed to kick /process for ${id}:`, err);
    });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { supabase } = ctx;

  const { id } = await params;

  let { data, error } = await supabase
    .from("contracts")
    .select(STATUS_COLS_FULL)
    .eq("id", id)
    .maybeSingle();

  // Tolerate a database that hasn't run migration 0011 yet (no heartbeat
  // columns): fall back to the base column set and the old uploaded_at timing.
  if (error && error.code === UNDEFINED_COLUMN) {
    ({ data, error } = await supabase
      .from("contracts")
      .select(STATUS_COLS_BASE)
      .eq("id", id)
      .maybeSingle());
  }

  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // The upload route schedules /process via after(), but after() is unreliable
  // in dev (and any environment where the worker is recycled before onClose
  // fires). Self-heal here: if the row is still queued by the time the client
  // polls status, kick the worker. The /process route claims via a status
  // gate so concurrent kicks are safe.
  if (data.status === "queued" && !kicked.has(id)) {
    kicked.add(id);
    kickProcess(req, id, false);
    // Allow a future poll to retry if the kick errored before the row moved
    // out of 'queued'.
    setTimeout(() => kicked.delete(id), 10_000);
  }

  // Self-healing reclaim: a contract whose analysis heartbeat has gone silent
  // was killed mid-flight and will never finish on its own. Reclaim it with
  // force=1 so a fresh worker RESUMES the pipeline (re-billing only the
  // unfinished clauses, not the whole document). Staleness is measured from the
  // freshest liveness signal we have — heartbeat, else processing start, else
  // upload — so a healthy long run is never reclaimed and never re-charged.
  if (data.status === "processing" && !reclaimed.has(id)) {
    const row = data as Record<string, unknown>;
    const reference =
      (row.analysis_heartbeat_at as string | null | undefined) ??
      (row.processing_started_at as string | null | undefined) ??
      (row.uploaded_at as string | null | undefined) ??
      null;
    const refMs = reference ? Date.parse(reference) : Number.NaN;
    const ageMs = Number.isFinite(refMs) ? Date.now() - refMs : Infinity;
    if (ageMs > STALE_PROCESSING_MS) {
      reclaimed.add(id);
      console.warn(
        `[status] contract ${id} heartbeat silent for ${Math.round(ageMs / 1000)}s — reclaiming (resume)`,
      );
      kickProcess(req, id, true);
      setTimeout(() => reclaimed.delete(id), RECLAIM_DEBOUNCE_MS);
    }
  }

  return NextResponse.json(data, { status: 200 });
}
