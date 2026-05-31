"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Must match the Zod cap in the clause-actions API (modified_text max 20000).
const MAX_LEN = 20000;

// Inline editor for the "Modify" workflow. Prefilled with the AI's suggested
// redline; on Save the edited wording is persisted (clause_actions.modified_text)
// and used verbatim in exports. Optimistic save + rollback is handled by the
// parent via `saving`/`error`; this component only owns the draft text.
export function RedlineEditor({
  clausePosition,
  initialText,
  saving,
  error,
  onSave,
  onCancel,
}: {
  clausePosition: number;
  initialText: string;
  saving: boolean;
  error: string | null;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Keep the draft in sync if the source text changes (e.g. the server returns
  // a normalized modified_text after a save).
  useEffect(() => {
    setValue(initialText);
  }, [initialText]);

  const trimmed = value.trim();
  const overCap = value.length > MAX_LEN;
  const unchanged = value === initialText;
  const canSave = !saving && trimmed.length > 0 && !overCap && !unchanged;

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSave) onSave(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="space-y-2">
      <label
        htmlFor={`redline-edit-${clausePosition}`}
        className="block text-[10px] uppercase tracking-[0.1em] text-ink-500 font-medium"
      >
        Edit redline for §{clausePosition}
      </label>
      <textarea
        id={`redline-edit-${clausePosition}`}
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        rows={6}
        aria-invalid={overCap}
        aria-describedby={`redline-count-${clausePosition}`}
        className="w-full resize-y rounded bg-ink-950/70 border border-ink-700 focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/40 outline-none px-3 py-2 text-[13px] leading-relaxed text-ink-100 dark-scrollbar placeholder:text-ink-600"
        placeholder="Type the exact wording you want in the contract…"
      />
      <div className="flex items-center justify-between gap-3">
        <span
          id={`redline-count-${clausePosition}`}
          className={cn(
            "text-[11px] font-[family-name:var(--font-mono)]",
            overCap ? "text-risk-high" : "text-ink-500",
          )}
        >
          {value.length.toLocaleString()} / {MAX_LEN.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-ink-400 hover:text-ink-200 text-[13px] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSave && onSave(value)}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving…" : "Save edit"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[12px] text-risk-high">
          {error}
        </p>
      )}
    </div>
  );
}
