import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createBearerClient(token: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
