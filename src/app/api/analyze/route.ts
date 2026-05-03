import { NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  contract_id: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = req.body ? await req.json() : {};
    parsed = bodySchema.parse(json ?? {});
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: err instanceof Error ? err.message : "invalid JSON",
      },
      { status: 400 },
    );
  }

  const { contract_id, force } = parsed;

  const supabase = await createClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, status")
    .eq("id", contract_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "query_failed", message: error.message },
      { status: 500 },
    );
  }
  if (!contract) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (contract.status === "processing" && !force) {
    return NextResponse.json(
      { error: "already_processing", contract_id, status: contract.status },
      { status: 409 },
    );
  }
  if (contract.status === "ready" && !force) {
    return NextResponse.json(
      { already_ready: true, contract_id, status: contract.status },
      { status: 200 },
    );
  }

  const secret = process.env.INTERNAL_PROCESSING_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: "config_error",
        message: "INTERNAL_PROCESSING_SECRET is not configured",
      },
      { status: 500 },
    );
  }

  const baseUrl = process.env.INTERNAL_BASE_URL ?? new URL(req.url).origin;
  const runId = randomUUID();
  const forceQuery = force ? "?force=1" : "";

  after(async () => {
    try {
      await fetch(
        `${baseUrl}/api/contracts/${contract_id}/process${forceQuery}`,
        {
          method: "POST",
          headers: { "x-internal-secret": secret },
        },
      );
    } catch {
      // Same fail-safe pattern as /upload: row stays in its current status
      // and a future cron sweeper can reclaim queued/failed rows.
    }
  });

  return NextResponse.json(
    { contract_id, status: "queued", run_id: runId },
    { status: 202 },
  );
}
