import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin =
    forwardedHost && process.env.NODE_ENV === "production"
      ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${forwardedHost}`
      : new URL(request.url).origin;

  return NextResponse.redirect(`${origin}${next}`);
}
