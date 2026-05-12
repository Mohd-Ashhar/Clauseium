"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/auth/errors";
import type { OAuthResult } from "@/lib/auth/form-state";

export type AddinOAuthProvider = "google" | "azure";

async function siteOrigin(): Promise<string> {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithOAuthForAddin(
  provider: AddinOAuthProvider,
): Promise<OAuthResult> {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/addin-auth/callback`,
      scopes: provider === "azure" ? "email openid profile" : undefined,
    },
  });

  if (error || !data?.url) {
    return { ok: false, error: mapAuthError(error) };
  }
  return { ok: true, url: data.url };
}
