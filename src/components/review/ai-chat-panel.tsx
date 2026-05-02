"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMockResponse, quickPrompts } from "@/lib/mock-streaming";
import { ChatMessage, type ChatMessageData } from "./chat-message";

export function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messageId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useCallback((prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || thinking) return;
    const userId = `m_${++messageId.current}`;
    const aiId = `m_${++messageId.current}`;
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text: trimmed },
    ]);
    setInput("");
    setThinking(true);

    // Tiny "thinking" delay before streaming begins.
    setTimeout(() => {
      const resp = getMockResponse(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          role: "ai",
          text: resp.text,
          citations: resp.citations,
          streaming: true,
        },
      ]);
      // Streaming completion is handled by the hook itself; we estimate when
      // citations should appear by clearing the thinking flag immediately.
      setThinking(false);
    }, 450);
  }, [thinking]);

  // Listen for "Ask AI" events from clause cards / selection toolbar.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") send(detail);
    };
    window.addEventListener("clauseium:ask-ai", handler);
    return () => window.removeEventListener("clauseium:ask-ai", handler);
  }, [send]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking]);

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-ink-900 border-t border-ink-700 min-h-0">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-ink-700 shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          <h3 className="text-[13px] font-semibold text-ink-100">Ask Clauseium</h3>
        </div>
        {!isEmpty && (
          <button
            onClick={() => setMessages([])}
            className="text-[12px] text-ink-500 hover:text-ink-300 transition-colors"
          >
            Clear chat
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto dark-scrollbar px-4 py-4 space-y-3">
        {isEmpty ? (
          <EmptyState onPick={send} />
        ) : (
          <>
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-ink-850 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this contract…"
            className="w-full bg-ink-850 border border-ink-700 hover:border-ink-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 rounded-xl px-4 py-3 pr-12 text-sm text-ink-100 placeholder:text-ink-500 transition-colors"
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={thinking}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors",
              )}
              aria-label="Send"
            >
              <ArrowUp className="h-3.5 w-3.5 text-white" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-4">
      <p className="text-[13px] text-ink-500 mb-3">
        Ask anything about this contract — grounded in Indian law.
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="text-xs bg-ink-850 border border-ink-700 rounded-full px-3 py-1.5 text-ink-400 hover:text-ink-200 hover:border-ink-500 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
