import { ChevronDown, ChevronUp, Send, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { streamChat } from "@addin/api/chat";
import { cn } from "@addin/lib/cn";
import type {
  ChatMessageInput,
  ChatStreamEvent,
  RefBundle,
} from "@addin/types/contract";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage, type DisplayMessage } from "./ChatMessage";

// Server's max message char limit (mirrors src/lib/ai/chat.schemas.ts).
const MAX_INPUT_CHARS = 8000;
const SOFT_WARN_CHARS = 7000;

interface ClauseHint {
  clauseId: string;
  defaultPrompt: string;
}

interface ChatDrawerProps {
  contractId: string;
  // When parent sets a hint (e.g. user clicked Ask AI on a clause), the
  // drawer auto-expands and auto-sends `defaultPrompt` with the clause_id.
  // After consuming, we call onConsumeHint so the parent can clear it.
  clauseHint: ClauseHint | null;
  onConsumeHint: () => void;
  getAccessToken: () => Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Reducer state
// ---------------------------------------------------------------------------

interface DrawerState {
  messages: DisplayMessage[];
  isExpanded: boolean;
  isStreaming: boolean;
  inputText: string;
  drawerError: string | null;
  nextSeq: number; // monotonic id generator for messages
}

const INITIAL: DrawerState = {
  messages: [],
  isExpanded: false,
  isStreaming: false,
  inputText: "",
  drawerError: null,
  nextSeq: 1,
};

type Action =
  | { type: "RESET" }
  | { type: "TOGGLE_EXPANDED" }
  | { type: "EXPAND" }
  | { type: "INPUT_CHANGE"; text: string }
  | { type: "BEGIN_SEND"; userText: string }
  | { type: "REFS"; messageId: string; refs: RefBundle[] }
  | { type: "DELTA"; messageId: string; chunk: string }
  | { type: "DONE"; messageId: string }
  | { type: "STREAM_ERROR"; messageId: string; code: string }
  | { type: "CLEAR_DRAWER_ERROR" };

function reducer(state: DrawerState, action: Action): DrawerState {
  switch (action.type) {
    case "RESET":
      return INITIAL;
    case "TOGGLE_EXPANDED":
      return { ...state, isExpanded: !state.isExpanded };
    case "EXPAND":
      return state.isExpanded ? state : { ...state, isExpanded: true };
    case "INPUT_CHANGE":
      return { ...state, inputText: action.text };
    case "BEGIN_SEND": {
      const userId = `u-${state.nextSeq}`;
      const aiId = `a-${state.nextSeq + 1}`;
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: userId,
            role: "user",
            text: action.userText,
            refs: [],
            isStreaming: false,
            errorCode: null,
          },
          {
            id: aiId,
            role: "assistant",
            text: "",
            refs: [],
            isStreaming: true,
            errorCode: null,
          },
        ],
        inputText: "",
        isStreaming: true,
        drawerError: null,
        nextSeq: state.nextSeq + 2,
      };
    }
    case "REFS":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, refs: action.refs } : m,
        ),
      };
    case "DELTA":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, text: m.text + action.chunk }
            : m,
        ),
      };
    case "DONE":
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, isStreaming: false } : m,
        ),
      };
    case "STREAM_ERROR":
      return {
        ...state,
        isStreaming: false,
        // Bubble drawer-level error code for things the user should see at
        // the chrome level (e.g. rate limit).
        drawerError:
          action.code === "too_many_streams" ||
          action.code === "chat_unavailable" ||
          action.code === "unauthorized"
            ? action.code
            : null,
        messages: state.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, isStreaming: false, errorCode: action.code }
            : m,
        ),
      };
    case "CLEAR_DRAWER_ERROR":
      return { ...state, drawerError: null };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatDrawer({
  contractId,
  clauseHint,
  onConsumeHint,
  getAccessToken,
}: ChatDrawerProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Whenever contractId changes (user opens a different .docx), reset the
  // chat state and abort any in-flight stream. Memory-only per the plan.
  useEffect(() => {
    abortRef.current?.abort();
    dispatch({ type: "RESET" });
  }, [contractId]);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-scroll on message growth.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.messages, state.isStreaming, state.isExpanded]);

  const send = useCallback(
    async (text: string, clauseId?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // New send cancels any in-flight stream.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // We rely on the reducer to assign ids; capture them by snapshotting
      // nextSeq before dispatch. The new assistant placeholder will get id
      // `a-${nextSeq+1}`.
      const assistantMessageId = `a-${state.nextSeq + 1}`;

      // Build the messages history we send to the server: all prior
      // messages (user + assistant text content) + the new user message.
      const apiHistory: ChatMessageInput[] = [
        ...state.messages
          .filter((m) => !m.errorCode && m.text.length > 0)
          .map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: trimmed },
      ];

      dispatch({ type: "BEGIN_SEND", userText: trimmed });

      const token = await getAccessToken();
      if (!token) {
        dispatch({
          type: "STREAM_ERROR",
          messageId: assistantMessageId,
          code: "unauthorized",
        });
        return;
      }

      const handler = (event: ChatStreamEvent) => {
        switch (event.type) {
          case "refs":
            dispatch({
              type: "REFS",
              messageId: assistantMessageId,
              refs: event.refs,
            });
            return;
          case "delta":
            dispatch({
              type: "DELTA",
              messageId: assistantMessageId,
              chunk: event.text,
            });
            return;
          case "done":
            dispatch({ type: "DONE", messageId: assistantMessageId });
            return;
          case "error":
            dispatch({
              type: "STREAM_ERROR",
              messageId: assistantMessageId,
              code: event.code,
            });
            return;
        }
      };

      try {
        await streamChat({
          contractId,
          messages: apiHistory,
          clauseId,
          accessToken: token,
          signal: controller.signal,
          onEvent: handler,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        dispatch({
          type: "STREAM_ERROR",
          messageId: assistantMessageId,
          code: "stream_failed",
        });
      }
    },
    // We intentionally don't include state.messages in deps — the closure
    // captures the current message list at call time, which is what we want
    // (a stale snapshot triggers a stale history send, not a bug).
    [contractId, getAccessToken, state.messages, state.nextSeq],
  );

  // Consume a clauseHint from the parent: expand, send, then signal back.
  useEffect(() => {
    if (!clauseHint) return;
    dispatch({ type: "EXPAND" });
    void send(clauseHint.defaultPrompt, clauseHint.clauseId);
    onConsumeHint();
    // intentionally omit `send` and `onConsumeHint` — both have stable
    // identities relative to the hint changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clauseHint]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state.inputText.trim().length === 0) return;
    if (state.inputText.length > MAX_INPUT_CHARS) return;
    void send(state.inputText);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits, Shift+Enter inserts a newline. Matches the web app.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  function handleClear() {
    abortRef.current?.abort();
    dispatch({ type: "RESET" });
  }

  const inputTooLong = state.inputText.length > MAX_INPUT_CHARS;
  const inputApproachingLimit = state.inputText.length >= SOFT_WARN_CHARS;
  const canSend =
    !inputTooLong && state.inputText.trim().length > 0 && !state.isStreaming;
  const isEmpty = state.messages.length === 0;

  return (
    <div
      className={cn(
        "border-t border-ink-800 bg-ink-900 flex flex-col shrink-0",
        state.isExpanded ? "h-[320px]" : "h-9",
      )}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: "TOGGLE_EXPANDED" })}
        className="flex items-center justify-between px-3 h-9 shrink-0 hover:bg-ink-850/60 transition-colors"
        aria-expanded={state.isExpanded}
        aria-controls="chat-drawer-body"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          <span className="text-[12px] font-medium text-ink-100">
            Ask Clauseium
          </span>
          {state.messages.length > 0 && (
            <span className="text-[10px] text-ink-500 font-[family-name:var(--font-mono)] tabular-nums">
              {state.messages.filter((m) => m.role === "user").length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {state.isExpanded && state.messages.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-[11px] text-ink-500 hover:text-ink-200 px-1.5 py-0.5 rounded transition-colors"
              aria-label="Clear chat"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {state.isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-ink-500" />
          )}
        </div>
      </button>

      {state.isExpanded && (
        <div
          id="chat-drawer-body"
          className="flex-1 flex flex-col min-h-0"
        >
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 min-h-0"
          >
            {isEmpty ? (
              <ChatEmptyState
                onSuggestionClick={(s) => void send(s)}
                disabled={state.isStreaming}
              />
            ) : (
              <ul className="space-y-3" aria-label="Conversation">
                {state.messages.map((m) => (
                  <li key={m.id}>
                    <ChatMessage message={m} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.drawerError && (
            <DrawerErrorBanner
              code={state.drawerError}
              onDismiss={() => dispatch({ type: "CLEAR_DRAWER_ERROR" })}
            />
          )}

          <form
            onSubmit={handleSubmit}
            className="border-t border-ink-800 p-2 flex items-end gap-1.5"
          >
            <textarea
              value={state.inputText}
              onChange={(e) =>
                dispatch({ type: "INPUT_CHANGE", text: e.target.value })
              }
              onKeyDown={handleKeyDown}
              placeholder={
                state.isStreaming
                  ? "Streaming…"
                  : "Ask about this contract…"
              }
              rows={1}
              maxLength={MAX_INPUT_CHARS + 200}
              className={cn(
                "flex-1 resize-none bg-ink-850 border rounded-md px-2 py-1.5 text-[12.5px] text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-1 focus:ring-brand-500 max-h-[72px] min-h-[28px]",
                inputTooLong
                  ? "border-risk-high focus:ring-risk-high"
                  : "border-ink-700",
              )}
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-md transition-colors shrink-0"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          {inputApproachingLimit && (
            <div
              className={cn(
                "px-2 pb-1.5 text-[10px] text-right",
                inputTooLong ? "text-risk-high" : "text-ink-500",
              )}
            >
              {state.inputText.length} / {MAX_INPUT_CHARS}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DrawerErrorBanner({
  code,
  onDismiss,
}: {
  code: string;
  onDismiss: () => void;
}) {
  return (
    <div className="px-3 py-1.5 border-t border-risk-high/30 bg-risk-high/10 text-[11px] text-risk-high flex items-center justify-between gap-2">
      <span>{drawerErrorExplain(code)}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-risk-high/70 hover:text-risk-high"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function drawerErrorExplain(code: string): string {
  switch (code) {
    case "too_many_streams":
      return "Only 2 chats can run at once. Wait a moment, then try again.";
    case "chat_unavailable":
      return "AI chat is temporarily unavailable.";
    case "unauthorized":
      return "Your session expired. Sign out and back in.";
    default:
      return "Chat error.";
  }
}
