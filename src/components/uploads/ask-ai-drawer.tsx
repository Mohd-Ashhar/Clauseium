"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { AskAiChat } from "./ask-ai-chat";

export interface AskAiDrawerProps {
  contractId: string;
  contractTitle: string;
  ready: boolean;
}

// Right-edge slide-in chat drawer mounted at the page level. Toggleable from
// the header trigger and auto-opens when any clause-level "Ask AI" button
// dispatches a `clauseium:ask-ai` event.
export function AskAiDrawer({
  contractId,
  contractTitle,
  ready,
}: AskAiDrawerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount the panel once on first open so the streaming hook keeps state
  // across drawer toggles, but don't pay its render cost up front.
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    const handler = () => {
      if (ready) setOpen(true);
    };
    window.addEventListener("clauseium:ask-ai", handler);
    return () => window.removeEventListener("clauseium:ask-ai", handler);
  }, [ready]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!ready}
        className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12.5px] font-medium px-3 py-1.5 rounded-md transition-colors"
        title={ready ? "Ask AI about this contract" : "Available once processing completes"}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Ask AI
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-label="Ask Clauseium chat drawer"
        >
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
          />
          <aside className="relative w-full max-w-md h-full bg-ink-900 border-l border-ink-700 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-ink-700 shrink-0">
              <div className="text-[11px] uppercase tracking-wider text-ink-500 truncate">
                {contractTitle}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-400 hover:text-ink-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {mounted && <AskAiChat contractId={contractId} />}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
