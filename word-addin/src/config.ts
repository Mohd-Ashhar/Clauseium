// Runtime configuration for the Clauseium Word add-in.
//
// All values here are PUBLIC — they ship in the client bundle. The Supabase
// anon key is the JWT signing key for short-lived public sessions and is
// safe to expose (the same value is in NEXT_PUBLIC_SUPABASE_ANON_KEY on the
// main app).
//
// Values are read from process.env at build time via webpack's DefinePlugin
// (see webpack.config.js). Dev fallbacks below let the task pane render
// from a fresh checkout without env vars set, but production builds MUST
// supply non-empty SUPABASE_URL + SUPABASE_ANON_KEY.

export const APP_ORIGIN: string =
  process.env.APP_ORIGIN ?? "http://localhost:3000";

export const ADDIN_ORIGIN: string =
  process.env.ADDIN_ORIGIN ?? "https://localhost:3001";

export const SUPABASE_URL: string = process.env.SUPABASE_URL ?? "";

export const SUPABASE_ANON_KEY: string = process.env.SUPABASE_ANON_KEY ?? "";

// Storage key for the auth tokens in localStorage. Versioned so we can
// invalidate stale token shapes during upgrades.
export const TOKEN_STORAGE_KEY = "clauseium.addin.tokens.v1";

// Surfaced by the auth context's sign-in flow when the Supabase env vars
// haven't been injected at build time — keeps the failure mode self-
// explanatory instead of the cryptic 401 we'd otherwise hit.
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
