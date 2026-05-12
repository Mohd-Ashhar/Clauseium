import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/auth/get-authed-context";

export const runtime = "nodejs";

const SHA256_HEX = /^[a-f0-9]{64}$/;

// GET /api/contracts/by-hash/:sha256
// Returns the current user's most recent contract whose uploaded bytes hash
// to the given SHA-256. The Word add-in hashes the open .docx client-side
// and calls this on document open to skip re-uploading something we already
// have. RLS confines the lookup to the caller's own rows.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sha256: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { supabase } = ctx;

  const { sha256: raw } = await params;
  const sha256 = raw.toLowerCase();
  if (!SHA256_HEX.test(sha256)) {
    return NextResponse.json(
      { error: "invalid_sha256", message: "expected 64-char lowercase hex" },
      { status: 400 },
    );
  }

  // Most-recent-first so reopening a file repeatedly always lands on the
  // latest analysis (e.g. after a force re-analyze).
  const { data, error } = await supabase
    .from("contracts")
    .select("id, status, title, processed_at, uploaded_at")
    .eq("content_sha256", sha256)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "query_failed", message: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      contractId: data.id,
      status: data.status,
      title: data.title,
      processed_at: data.processed_at,
      uploaded_at: data.uploaded_at,
    },
    { status: 200 },
  );
}
