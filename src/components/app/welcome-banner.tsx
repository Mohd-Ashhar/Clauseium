"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

const KEY = "clauseium_welcomed_v1";

// One-time welcome — distinct from the empty state (which renders every time a
// user has zero contracts). Persisted in localStorage so it shows once.
export function WelcomeBanner({ name }: { name: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode / disabled storage — just skip the welcome */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-counsel-500/25 bg-counsel-500/6 p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-counsel-500/15 text-counsel-500">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-[family-name:var(--font-display)] text-[16px] font-medium text-ink-100">
          Welcome to Clauseium{name ? `, ${name}` : ""}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-300">
          Upload a vendor contract to see clause-by-clause risk, verified Indian-law
          citations, and a redlined Word doc — usually in about 6 minutes. Your
          contracts are never used to train models.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="shrink-0 rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
