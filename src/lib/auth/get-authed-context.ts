import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBearerClient } from "@/lib/supabase/bearer";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/contract";
import { mapSupabaseUser } from "./get-current-user";

export interface AuthedContext {
  user: User;
  // RLS-bound Supabase client matching the request's auth mode:
  //   - Bearer header  → @supabase/supabase-js client carrying Authorization
  //   - cookies        → @supabase/ssr server client reading next/headers cookies
  // Pass this to .from() queries so RLS sees the same identity that auth saw.
  supabase: SupabaseClient;
}

export async function getAuthedContext(req: Request): Promise<AuthedContext | null> {
  const auth = req.headers.get("authorization");

  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (!token) return null;

    try {
      const supabase = createBearerClient(token);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user) return null;
      return { user: mapSupabaseUser(user), supabase };
    } catch {
      return null;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user: mapSupabaseUser(user), supabase };
}
