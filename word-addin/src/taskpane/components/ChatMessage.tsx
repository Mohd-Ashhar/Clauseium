import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@addin/lib/cn";
import type { RefBundle } from "@addin/types/contract";
import { RefChip } from "./RefChip";

// One chat-message bubble. Server emits `[REF_N]` tokens inline; we replace
// them with small clickable RefChip inline variants so the citation is
// glanceable in-context. Refs that don't appear in the bundle are rendered
// as literal `[REF_N]` text (defensive — never crash on a hallucinated ref).

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  refs: RefBundle[];
  isStreaming: boolean;
  errorCode: string | null;
}

const REF_TOKEN_RX = /\[REF_(\d+)\]/g;

export function ChatMessage({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-xl border px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-brand-500/15 border-brand-500/30 text-ink-100"
            : "bg-ink-850 border-ink-700 text-ink-200",
        )}
      >
        {message.text.length === 0 && message.isStreaming ? (
          <ThinkingDots />
        ) : (
          <>
            {renderWithRefs(message.text, message.refs)}
            {message.isStreaming && <StreamingCaret />}
          </>
        )}
      </div>

      {message.errorCode && (
        <ErrorBadge code={message.errorCode} />
      )}

      {!isUser && message.refs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-[90%]">
          {message.refs.map((ref) => (
            <RefChip key={ref.ref_id} ref={ref} variant="block" />
          ))}
        </div>
      )}
    </div>
  );
}

// Walk the text once, emitting plain-text nodes interleaved with inline
// RefChip nodes for each `[REF_N]` match. Token numbering is 1-indexed in
// the server output (REF_1, REF_2, …) and aligned with the refs array's
// natural order.
function renderWithRefs(text: string, refs: RefBundle[]): ReactNode[] {
  if (!text) return [];
  const refByNumber = new Map<number, RefBundle>();
  refs.forEach((ref, idx) => {
    const match = /^REF_(\d+)$/.exec(ref.ref_id);
    const n = match ? Number.parseInt(match[1]!, 10) : idx + 1;
    refByNumber.set(n, ref);
  });

  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(REF_TOKEN_RX)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      out.push(
        <span key={`t-${key++}`}>{text.slice(cursor, start)}</span>,
      );
    }
    const num = Number.parseInt(match[1]!, 10);
    const ref = refByNumber.get(num);
    if (ref) {
      out.push(<RefChip key={`r-${key++}`} ref={ref} variant="inline" />);
    } else {
      out.push(<span key={`t-${key++}`}>{match[0]}</span>);
    }
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    out.push(<span key={`t-${key++}`}>{text.slice(cursor)}</span>);
  }
  return out;
}

function ThinkingDots() {
  return (
    <span
      className="inline-flex gap-0.5 items-center"
      aria-label="Thinking"
      role="status"
    >
      <span className="h-1 w-1 rounded-full bg-ink-500 animate-pulse [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-ink-500 animate-pulse [animation-delay:200ms]" />
      <span className="h-1 w-1 rounded-full bg-ink-500 animate-pulse [animation-delay:400ms]" />
    </span>
  );
}

function StreamingCaret() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[6px] h-3.5 bg-ink-300 ml-0.5 -mb-0.5 animate-pulse"
    />
  );
}

function ErrorBadge({ code }: { code: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-risk-high">
      <AlertCircle className="h-3 w-3" />
      <span>{explainError(code)}</span>
    </div>
  );
}

function explainError(code: string): string {
  switch (code) {
    case "unauthorized":
      return "Sign in again to continue.";
    case "contract_not_ready":
      return "Analysis is still in progress — try again in a moment.";
    case "too_many_streams":
      return "Only 2 chats can run at once. Wait a few seconds, then resend.";
    case "chat_unavailable":
      return "AI chat is temporarily unavailable.";
    case "network_error":
      return "Network error — check your connection and try again.";
    case "stream_failed":
      return "Stream interrupted. Try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
