"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "./errors";
import type { FormState, OAuthResult } from "./form-state";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

async function siteOrigin(): Promise<string> {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", formError: mapAuthError(error) };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signUpWithPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const next = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { status: "error", formError: mapAuthError(error) };
  }

  if (data.session) {
    redirect(next);
  }

  return {
    status: "success",
    message: "Check your email to confirm your account, then sign in.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithGoogle(next?: string): Promise<OAuthResult> {
  const supabase = await createClient();
  const origin = await siteOrigin();
  const safe = safeNext(next ?? null);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safe)}`,
    },
  });

  if (error || !data?.url) {
    return { ok: false, error: mapAuthError(error) };
  }

  return { ok: true, url: data.url };
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
  });

  if (error) {
    return { status: "error", formError: mapAuthError(error) };
  }

  return {
    status: "success",
    message: "If an account exists for that email, we've sent a reset link.",
  };
}
