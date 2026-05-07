import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const leadSchema = z.object({
  email: z.string().email().max(254),
  source: z
    .enum(["template_download", "newsletter", "demo_book", "free_trial"])
    .default("newsletter"),
  contentSlug: z.string().max(120).optional(),
  templateId: z.string().max(120).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

const SIGNED_URL_TTL_SECONDS = 600;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, source, contentSlug, templateId, utm } = parsed.data;

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "Server is not configured for lead capture." },
      { status: 503 },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? null;

  const { error: insertError } = await supabase.from("leads").insert({
    email,
    source,
    content_slug: contentSlug ?? null,
    template_id: templateId ?? null,
    utm: utm ?? null,
    user_agent: userAgent,
  });

  // 23505 = unique violation; treat as success (already subscribed/captured).
  if (insertError && insertError.code !== "23505") {
    return NextResponse.json(
      { error: "Could not save your email. Please try again." },
      { status: 500 },
    );
  }

  if (source !== "template_download" || !templateId) {
    return NextResponse.json({ ok: true });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("templates")
    .createSignedUrl(templateId, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    // Lead captured but file not yet uploaded — return ok without download URL.
    return NextResponse.json({ ok: true, downloadUrl: null });
  }

  return NextResponse.json({ ok: true, downloadUrl: signed.signedUrl });
}
