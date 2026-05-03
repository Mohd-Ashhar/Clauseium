import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { processContract } from "@/lib/ingestion/orchestrate";
import { assertInternalRequest, InternalAuthError } from "@/lib/ingestion/internal-auth";
import type { ContractRecord } from "@/types/ingestion";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertInternalRequest(req);
  } catch (err) {
    if (err instanceof InternalAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "1";
  const claimableStatuses = force
    ? ["queued", "failed", "ready", "processing"]
    : ["queued", "failed"];

  const client = createServiceRoleClient();

  const { data: claimed, error: claimError } = await client
    .from("contracts")
    .update({ status: "processing", error_message: null })
    .eq("id", id)
    .in("status", claimableStatuses)
    .select("*")
    .maybeSingle();

  if (claimError) {
    return NextResponse.json(
      { error: "claim_failed", message: claimError.message },
      { status: 500 },
    );
  }

  if (!claimed) {
    return NextResponse.json({ alreadyClaimed: true }, { status: 200 });
  }

  try {
    await processContract(claimed as ContractRecord);
    return NextResponse.json({ status: "ready" }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "failed", message }, { status: 200 });
  }
}
