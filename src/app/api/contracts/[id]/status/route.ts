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

// A contract is considered stuck if it has been 'processing' longer than this.
// The /process route runs under maxDuration=300s (5 min); anything still
// 'processing' well past that was killed mid-flight (serverless timeout,
// worker recycle) and will never finish on its own — so reclaiming is safe.
const STALE_PROCESSING_MS = 7 * 60 * 1000;
const RECLAIM_DEBOUNCE_MS = STALE_PROCESSING_MS;

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

  const { data, error } = await supabase
    .from("contracts")
    .select("id, status, error_message, page_count, processed_at, uploaded_at")
    .eq("id", id)
    .maybeSingle();

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

  // Self-healing reclaim: a contract stuck in 'processing' past the serverless
  // execution window was killed mid-flight and will never finish on its own.
  // Reclaim it with force=1 so a fresh worker re-runs the pipeline. The longer
  // debounce prevents re-firing while a reclaim is itself in flight.
  if (data.status === "processing" && !reclaimed.has(id)) {
    const startedMs = data.uploaded_at
      ? Date.parse(data.uploaded_at as string)
      : Date.now();
    const ageMs = Date.now() - startedMs;
    if (Number.isFinite(ageMs) && ageMs > STALE_PROCESSING_MS) {
      reclaimed.add(id);
      console.warn(
        `[status] contract ${id} stuck in processing for ${Math.round(ageMs / 1000)}s — reclaiming`,
      );
      kickProcess(req, id, true);
      setTimeout(() => reclaimed.delete(id), RECLAIM_DEBOUNCE_MS);
    }
  }

  return NextResponse.json(data, { status: 200 });
}
