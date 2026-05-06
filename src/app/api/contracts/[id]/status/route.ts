import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Tracks queued contracts we've already kicked off in this server process so
// the same poll-burst doesn't fire /process repeatedly while the orchestrator
// is mid-flight. The /process route is idempotent on its own, but skipping
// the redundant fetch keeps dev logs clean.
const kicked = new Set<string>();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

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
    const secret = process.env.INTERNAL_PROCESSING_SECRET;
    if (secret) {
      const baseUrl = process.env.INTERNAL_BASE_URL ?? new URL(req.url).origin;
      void fetch(`${baseUrl}/api/contracts/${id}/process`, {
        method: "POST",
        headers: { "x-internal-secret": secret },
      })
        .catch((err) => {
          console.error(`[status] failed to kick /process for ${id}:`, err);
        })
        .finally(() => {
          // Allow a future poll to retry if the kick errored before the row
          // moved out of 'queued'.
          setTimeout(() => kicked.delete(id), 10_000);
        });
    } else {
      console.warn(
        `[status] contract ${id} stuck in queued and INTERNAL_PROCESSING_SECRET is unset — cannot kick worker`,
      );
    }
  }

  return NextResponse.json(data, { status: 200 });
}
