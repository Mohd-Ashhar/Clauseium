import "server-only";
import { cache } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types/contract";

const AVATAR_PALETTE = [
  "bg-brand-500",
  "bg-counsel-500",
  "bg-risk-info",
  "bg-risk-low",
  "bg-brand-600",
] as const;

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? mapSupabaseUser(user) : null;
});

function mapSupabaseUser(user: SupabaseUser): User {
  const email = user.email ?? "";
  const metadata = user.user_metadata ?? {};
  const rawName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    email.split("@")[0] ||
    "Member";
  const name = rawName.trim();

  return {
    id: user.id,
    email,
    name,
    role: "reviewer",
    initials: deriveInitials(name),
    avatarColor: deriveAvatarColor(user.id),
  };
}

function deriveInitials(name: string): string {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toUpperCase();
  }
  const first = tokens[0] ?? "M";
  return first.slice(0, 2).toUpperCase();
}

function deriveAvatarColor(id: string): string {
  const code = id.charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}
