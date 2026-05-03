import type { AuthError } from "@supabase/supabase-js";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  email_not_confirmed: "Confirm your email address to continue. Check your inbox.",
  over_request_rate_limit: "Too many attempts. Try again in a few minutes.",
  user_already_exists: "An account with this email already exists.",
  weak_password: "Choose a stronger password.",
  signup_disabled: "Sign-ups are temporarily disabled.",
  email_address_invalid: "Enter a valid email address.",
  same_password: "New password must be different from the current one.",
};

export function mapAuthError(error: AuthError | { code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong. Try again.";
  const code = "code" in error ? error.code : undefined;
  if (code && MESSAGES[code]) return MESSAGES[code];
  return error.message ?? "Something went wrong. Try again.";
}
