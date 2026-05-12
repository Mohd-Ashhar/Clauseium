// Runtime configuration for the Clauseium Word add-in.
//
// All values here are PUBLIC — they ship in the client bundle. The Supabase
// anon key is the JWT signing key for short-lived public sessions and is
// safe to expose (the same value is in NEXT_PUBLIC_SUPABASE_ANON_KEY on the
// main app). For per-environment values, swap this file via webpack alias
// or a build-time DefinePlugin pass — kept as a static module here so the
// dev scaffold doesn't need extra build wiring.

export const APP_ORIGIN = "http://localhost:3000";
export const ADDIN_ORIGIN = "https://localhost:3001";

// Supabase project. Both values are also exposed to the main app via
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy them
// from .env.local into here for local development.
export const SUPABASE_URL = "https://orqvybuohvqofeocifit.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXZ5YnVvaHZxb2Zlb2NpZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTgyMTEsImV4cCI6MjA5MzIzNDIxMX0.msx5YrQ-_vQG8jT0w2YO4-HxRfCinPqSxks1AbTud2s";

// Storage key for the auth tokens in localStorage. Versioned so we can
// invalidate stale token shapes during upgrades.
export const TOKEN_STORAGE_KEY = "clauseium.addin.tokens.v1";
