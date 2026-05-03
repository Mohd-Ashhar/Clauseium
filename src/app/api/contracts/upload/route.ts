import { NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { uploadFormSchema } from "@/lib/ingestion/schemas";
import { SUPPORTED_MIME_TYPES, type SupportedMimeType } from "@/types/ingestion";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  const titleField = formData.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const title = typeof titleField === "string" && titleField.trim().length > 0
    ? titleField.trim()
    : file.name;

  const parseResult = uploadFormSchema.safeParse({
    title,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const mimeType = parseResult.data.mimeType as SupportedMimeType;
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "unsupported_mime" }, { status: 400 });
  }

  const supabase = await createClient();
  const contractId = randomUUID();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `${user.id}/${contractId}/${safeName}`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: storageError } = await supabase.storage
    .from("contracts")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json(
      { error: "storage_upload_failed", message: storageError.message },
      { status: 502 },
    );
  }

  const { error: insertError } = await supabase.from("contracts").insert({
    id: contractId,
    owner_user_id: user.id,
    title: parseResult.data.title,
    original_filename: file.name,
    mime_type: mimeType,
    file_size_bytes: file.size,
    storage_path: storagePath,
    status: "queued",
  });

  if (insertError) {
    await supabase.storage.from("contracts").remove([storagePath]);
    return NextResponse.json(
      { error: "db_insert_failed", message: insertError.message },
      { status: 502 },
    );
  }

  const baseUrl = process.env.INTERNAL_BASE_URL ?? new URL(req.url).origin;
  const secret = process.env.INTERNAL_PROCESSING_SECRET;

  if (secret) {
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/contracts/${contractId}/process`, {
          method: "POST",
          headers: { "x-internal-secret": secret },
        });
      } catch {
        // The row stays 'queued'; a future cron sweeper reclaims it.
      }
    });
  }

  return NextResponse.json({ contractId, status: "queued" }, { status: 202 });
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned.length > 120 ? cleaned.slice(-120) : cleaned;
}
