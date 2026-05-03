import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyCitations(
  supa: SupabaseClient,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await supa
    .from("legal_chunks")
    .select("id")
    .in("id", ids);

  if (error) throw new Error(`verifyCitations failed: ${error.message}`);
  return new Set((data ?? []).map((r) => r.id as string));
}
