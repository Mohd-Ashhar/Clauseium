"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";

export function SignOutMenuItem() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-300 hover:bg-ink-850 hover:text-ink-100"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
      </button>
    </form>
  );
}
