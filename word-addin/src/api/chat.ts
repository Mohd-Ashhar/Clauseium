import { apiFetchRaw } from "./client";
import type {
  ChatMessageInput,
  ChatStreamEvent,
  ChatTokenUsage,
  RefBundle,
} from "@addin/types/contract";

// SSE consumer for POST /api/contracts/:id/chat.
//
// Mirror of the parsing approach in src/components/uploads/ask-ai-chat.tsx
// in the web app — read body via getReader(), decode + accumulate, split
// on the `\n\n` frame boundary, extract `event:` and `data:` lines from
// each frame, parse the JSON payload, dispatch a typed event.
//
// We don't use EventSource because it can't carry the Authorization:
// Bearer header that the add-in requires. fetch + ReadableStream gives
// us the same wire format with full control over headers + abort.
//
// Errors handled here:
//   - 401/409/429/503 + any other non-2xx     → dispatched as a synthesized
//                                                event: error before return.
//   - response.body === null                  → "request_failed".
//   - reader throws (network)                 → re-thrown as ChatStreamError.
//   - AbortError                              → swallowed; caller will see
//                                                the abort via its own signal.

export class ChatStreamError extends Error {
  constructor(
    public readonly code:
      | "unauthorized"
      | "contract_not_ready"
      | "too_many_streams"
      | "chat_unavailable"
      | "request_failed"
      | "network_error"
      | "stream_failed",
    message: string,
  ) {
    super(message);
    this.name = "ChatStreamError";
  }
}

export interface StreamChatInput {
  contractId: string;
  messages: ChatMessageInput[];
  clauseId?: string;
  accessToken: string;
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}

export async function streamChat(input: StreamChatInput): Promise<void> {
  const {
    contractId,
    messages,
    clauseId,
    accessToken,
    signal,
    onEvent,
  } = input;

  const body: { messages: ChatMessageInput[]; clause_id?: string } = {
    messages,
  };
  if (clauseId) body.clause_id = clauseId;

  let response: Response;
  try {
    response = await apiFetchRaw(
      `/api/contracts/${contractId}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
      accessToken,
    );
  } catch (err) {
    if (isAbort(err)) return;
    onEvent({
      type: "error",
      code: "network_error",
      message: err instanceof Error ? err.message : "Network error",
    });
    return;
  }

  if (!response.ok || !response.body) {
    onEvent({
      type: "error",
      code: statusToCode(response.status),
      message: await safeErrorText(response),
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    // Read loop: accumulate bytes, peel off complete frames (terminated by
    // \n\n), dispatch, and stash the remainder for the next chunk.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        dispatchFrame(frame, onEvent);
      }
    }
    if (buf.trim().length > 0) dispatchFrame(buf, onEvent);
  } catch (err) {
    if (isAbort(err)) return;
    onEvent({
      type: "error",
      code: "stream_failed",
      message: err instanceof Error ? err.message : "Stream failed",
    });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Already released or stream closed; nothing to do.
    }
  }
}

function dispatchFrame(
  raw: string,
  onEvent: (event: ChatStreamEvent) => void,
): void {
  // Each frame is two-ish lines: `event: <name>` and `data: <json>`. A frame
  // without either is a no-op (e.g. heartbeat newlines).
  let event: string | null = null;
  let dataLine = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLine += line.slice(5).trim();
    }
  }
  if (!event || !dataLine) return;

  let payload: unknown;
  try {
    payload = JSON.parse(dataLine);
  } catch {
    // Malformed JSON — surface as a stream error rather than crashing.
    onEvent({
      type: "error",
      code: "stream_failed",
      message: `Unparseable SSE payload for event ${event}`,
    });
    return;
  }

  switch (event) {
    case "refs": {
      const refs = (payload as { refs?: RefBundle[] }).refs ?? [];
      onEvent({ type: "refs", refs });
      return;
    }
    case "delta": {
      const text = (payload as { text?: string }).text ?? "";
      onEvent({ type: "delta", text });
      return;
    }
    case "done": {
      const usage = (payload as { usage?: ChatTokenUsage | null }).usage ?? null;
      onEvent({ type: "done", usage });
      return;
    }
    case "error": {
      const p = payload as { code?: string; message?: string };
      onEvent({
        type: "error",
        code: p.code ?? "stream_failed",
        message: p.message ?? "Stream error",
      });
      return;
    }
    default:
      // Unknown event name — ignore for forward compatibility.
      return;
  }
}

function statusToCode(status: number): ChatStreamError["code"] {
  switch (status) {
    case 401:
      return "unauthorized";
    case 409:
      return "contract_not_ready";
    case 429:
      return "too_many_streams";
    case 503:
      return "chat_unavailable";
    default:
      return "request_failed";
  }
}

async function safeErrorText(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as {
      error?: string;
      message?: string;
    };
    return body.message ?? body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
