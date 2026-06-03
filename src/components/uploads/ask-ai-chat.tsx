"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Maximize2,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CitationChip } from "./citation-chip";

interface RefBundle {
  ref_id: string;
  source_id: string;
  citation: string;
  url: string | null;
  source: "statute" | "case";
  snippet: string;
  status?: "verified" | "partially_verified" | "unverified" | "retrieved";
}

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  refs?: RefBundle[];
  streaming?: boolean;
  errorCode?: string;
}

const QUICK_PROMPTS = [
  "Summarise key risks in this contract",
  "Is the indemnity reasonable under Indian law?",
  "Are the DPDP obligations adequately covered?",
];

export interface AskAiChatProps {
  contractId: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onExpand?: () => void;
}

export function AskAiChat({
  contractId,
  collapsed = false,
  onToggleCollapsed,
  onExpand,
}: AskAiChatProps) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || thinking) return;

      const userId = `m_${++idRef.current}`;
      const aiId = `m_${++idRef.current}`;

      const userMsg: UiMessage = { id: userId, role: "user", text: trimmed };
      const aiMsg: UiMessage = {
        id: aiId,
        role: "assistant",
        text: "",
        streaming: true,
      };

      // Build the API history — use messages that already exist plus the new
      // user turn. Filter to fully-formed turns (ignore in-flight streaming).
      const apiHistory: ApiMessage[] = [
        ...messages
          .filter((m) => !m.streaming && !m.errorCode)
          .map<ApiMessage>((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
        { role: "user", content: trimmed },
      ];

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput("");
      setThinking(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/contracts/${contractId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiHistory }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const code =
            res.status === 401
              ? "unauthorized"
              : res.status === 409
                ? "contract_not_ready"
                : res.status === 429
                  ? "too_many_streams"
                  : res.status === 503
                    ? "chat_unavailable"
                    : "request_failed";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, streaming: false, errorCode: code }
                : m,
            ),
          );
          setError(code);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const frames = buf.split("\n\n");
          buf = frames.pop() ?? "";
          for (const frame of frames) {
            handleFrame(frame, aiId, setMessages, setError);
          }
        }
        // Flush any final frame.
        if (buf.trim().length > 0) handleFrame(buf, aiId, setMessages, setError);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // Cancelled by unmount or by the user — leave as-is.
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, streaming: false, errorCode: "network_error" }
              : m,
          ),
        );
        setError("network_error");
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId && m.streaming ? { ...m, streaming: false } : m,
          ),
        );
        setThinking(false);
        abortRef.current = null;
      }
    },
    [contractId, messages, thinking],
  );

  // Cancel any in-flight stream on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  // Listen for "Ask AI" events from clause-level buttons.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") send(detail);
    };
    window.addEventListener("clauseium:ask-ai", handler);
    return () => window.removeEventListener("clauseium:ask-ai", handler);
  }, [send]);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-ink-900 min-h-0">
      <header
        className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b border-ink-700 shrink-0",
          onToggleCollapsed && "cursor-pointer select-none hover:bg-ink-850/60 transition-colors",
        )}
        onClick={onToggleCollapsed ? () => onToggleCollapsed() : undefined}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-counsel-400" />
          <h3 className="text-[13px] font-semibold text-ink-100">
            Ask Clauseium
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {!isEmpty && !collapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                abortRef.current?.abort();
                setMessages([]);
                setError(null);
              }}
              className="text-[12px] text-ink-500 hover:text-ink-300 transition-colors px-2 py-1 rounded"
            >
              Clear chat
            </button>
          )}
          {onExpand && !collapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="h-7 w-7 inline-flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded transition-colors"
              aria-label="Expand chat to fill"
              title="Expand to fill"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapsed();
              }}
              className="h-7 w-7 inline-flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded transition-colors"
              aria-label={collapsed ? "Expand chat" : "Collapse chat"}
              title={collapsed ? "Expand chat" : "Collapse chat"}
            >
              {collapsed ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        aria-live="polite"
        className={cn(
          "flex-1 overflow-y-auto dark-scrollbar px-4 py-4 space-y-3",
          collapsed && "hidden",
        )}
      >
        {isEmpty ? (
          <EmptyState onPick={send} />
        ) : (
          <>
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {thinking &&
              !messages[messages.length - 1]?.text &&
              !messages[messages.length - 1]?.errorCode && <Thinking />}
          </>
        )}
      </div>

      {error && !collapsed && (
        <div className="px-4 pb-2 text-[11px] text-risk-high">
          {explainError(error)}
        </div>
      )}

      <div
        className={cn(
          "px-4 pb-4 pt-2 shrink-0 border-t border-ink-700",
          collapsed && "hidden",
        )}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!thinking) send(input);
              }
            }}
            rows={1}
            placeholder="Ask about this contract…  (Enter to send, Shift+Enter for newline)"
            className="w-full resize-none bg-ink-850 border border-ink-700 hover:border-ink-500 focus:border-counsel-500 focus:outline-none focus:ring-1 focus:ring-counsel-500/30 rounded-xl px-4 py-3 pr-12 text-sm text-ink-100 placeholder:text-ink-500 transition-colors max-h-32"
            disabled={thinking}
          />
          {thinking ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-ink-200 hover:border-ink-400 hover:text-white transition-colors"
              aria-label="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            input.trim() && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-full bg-counsel-500 hover:bg-counsel-600 disabled:opacity-50 transition-colors"
                aria-label="Send"
              >
                <ArrowUp className="h-3.5 w-3.5 text-ink-950" />
              </button>
            )
          )}
        </form>
      </div>
    </div>
  );
}

function handleFrame(
  raw: string,
  aiId: string,
  setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  setError: (s: string | null) => void,
): void {
  let event: string | null = null;
  let dataLine = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }
  if (!event || !dataLine) return;
  let payload: unknown;
  try {
    payload = JSON.parse(dataLine);
  } catch {
    return;
  }

  if (event === "refs") {
    const refs = (payload as { refs?: RefBundle[] }).refs ?? [];
    setMessages((prev) =>
      prev.map((m) => (m.id === aiId ? { ...m, refs } : m)),
    );
  } else if (event === "delta") {
    const text = (payload as { text?: string }).text ?? "";
    setMessages((prev) =>
      prev.map((m) =>
        m.id === aiId ? { ...m, text: m.text + text } : m,
      ),
    );
  } else if (event === "done") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === aiId ? { ...m, streaming: false } : m,
      ),
    );
  } else if (event === "error") {
    const code = (payload as { code?: string }).code ?? "stream_error";
    setMessages((prev) =>
      prev.map((m) =>
        m.id === aiId ? { ...m, streaming: false, errorCode: code } : m,
      ),
    );
    setError(code);
  }
}

function explainError(code: string): string {
  switch (code) {
    case "chat_unavailable":
      return "Chat is unavailable — Anthropic API key not configured.";
    case "contract_not_ready":
      return "Contract is still processing — try again in a moment.";
    case "too_many_streams":
      return "Too many active chats — close one and retry.";
    case "unauthorized":
      return "Session expired — please refresh and sign in again.";
    case "network_error":
      return "Network error — your message wasn't delivered.";
    default:
      return `Chat failed: ${code}.`;
  }
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-4">
      <p className="text-[13px] text-ink-500 mb-3">
        Ask anything about this contract — grounded in Indian law.
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
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

function Thinking() {
  return (
    <div className="flex justify-start">
      <div className="bg-ink-850 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-ink-500 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-ink-500 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-ink-500 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

function Message({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-counsel-500/15 text-ink-100 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }

  // Replace [REF_n] tokens inline with anchor links to the matching ref.
  const refMap = new Map<string, RefBundle>();
  for (const r of message.refs ?? []) refMap.set(r.ref_id, r);

  const rendered = renderWithRefs(message.text, refMap);

  return (
    <div className="flex justify-start">
      <div className="bg-ink-850 text-ink-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[92%] text-sm space-y-2">
        <div className="leading-relaxed whitespace-pre-wrap">
          {rendered}
          {message.streaming && (
            <span className="inline-block w-[2px] h-[1em] align-text-bottom bg-counsel-500 animate-pulse ml-[1px]" />
          )}
        </div>
        {message.errorCode && (
          <div className="text-[11px] text-risk-high italic">
            {explainError(message.errorCode)}
          </div>
        )}
        {message.refs && message.refs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.refs.map((r) => (
              <RefChip key={r.ref_id} ref_={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderWithRefs(
  text: string,
  refMap: Map<string, RefBundle>,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[REF_(\d+)\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(text.slice(lastIdx, match.index));
    }
    const refId = `REF_${match[1]}`;
    const ref = refMap.get(refId);
    if (ref?.url) {
      out.push(
        <a
          key={`r${key++}`}
          href={ref.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-counsel-400 hover:text-counsel-300 underline decoration-dotted underline-offset-2"
        >
          [{refId}]
        </a>,
      );
    } else {
      out.push(
        <span key={`r${key++}`} className="text-counsel-400">
          [{refId}]
        </span>,
      );
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}

function RefChip({ ref_ }: { ref_: RefBundle }) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    ref_.url ? (
      <a
        href={ref_.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 px-2.5 py-1 bg-ink-800 border border-ink-700 rounded-lg text-xs hover:border-counsel-500/40 hover:bg-ink-800/80 transition-colors"
      >
        {children}
        <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
      </a>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ink-800 border border-ink-700 rounded-lg text-xs">
        {children}
      </span>
    );
  return (
    <Wrapper>
      <span className="font-[family-name:var(--font-mono)] text-[11px] text-ink-300">
        [{ref_.ref_id}]
      </span>
      <span className="text-[11px] text-ink-400">{ref_.citation}</span>
      {/* Honest provenance via the shared chip: chat refs are retrieved from the
          corpus but NOT verification-checked — never imply a green "verified". */}
      <CitationChip status={ref_.status ?? "retrieved"} />
    </Wrapper>
  );
}
