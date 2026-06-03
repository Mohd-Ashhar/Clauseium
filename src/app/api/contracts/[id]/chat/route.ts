import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/auth/get-authed-context";
import { searchLegalCorpus } from "@/lib/rag/search";
import { sseEncode, SSE_HEADERS } from "@/lib/ai/sse";
import {
  CHAT_MAX_CLAUSES,
  CHAT_MAX_TOKENS,
  CHAT_MODEL,
  ChatLlmUnavailableError,
  buildRefBundle,
  buildSystemPrompt,
  findUnknownRefTokens,
  getAnthropicClient,
  isChatLlmAvailable,
  releaseSlot,
  toAnthropicMessages,
  tryAcquireSlot,
  type ChatClauseContext,
} from "@/lib/ai/chat";
import { chatRequestSchema } from "@/lib/ai/chat.schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ClauseContextRow {
  id: string;
  section_title: string | null;
  section_position: number | null;
  clause_number: string | null;
  position: number | null;
  clause_text: string;
}

const CLAUSE_CONTEXT_FIELDS =
  "id, section_title, section_position, clause_number, position, clause_text";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthedContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { user, supabase } = ctx;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "invalid JSON" },
      { status: 400 },
    );
  }

  const parseResult = chatRequestSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parseResult.error.flatten() },
      { status: 400 },
    );
  }
  const parsed = parseResult.data;

  const { id: contractId } = await params;
  const { messages, clause_id } = parsed;

  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .select("id, title, status")
    .eq("id", contractId)
    .maybeSingle();

  if (contractErr) {
    return NextResponse.json(
      { error: "query_failed", message: contractErr.message },
      { status: 500 },
    );
  }
  if (!contract) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (contract.status !== "ready") {
    return NextResponse.json(
      {
        error: "contract_not_ready",
        message: `contract status is ${contract.status}`,
      },
      { status: 409 },
    );
  }

  if (!isChatLlmAvailable()) {
    return NextResponse.json(
      {
        error: "chat_unavailable",
        message: "ANTHROPIC_API_KEY not configured",
      },
      { status: 503 },
    );
  }

  // Build clause context: focus clause + neighbors if clause_id given,
  // otherwise the first CHAT_MAX_CLAUSES clauses.
  let clauseQuery = supabase
    .from("clauses")
    .select(CLAUSE_CONTEXT_FIELDS)
    .eq("contract_id", contractId)
    .order("section_position", { ascending: true })
    .order("position", { ascending: true });

  if (clause_id) {
    const { data: focus } = await supabase
      .from("clauses")
      .select("section_position")
      .eq("id", clause_id)
      .eq("contract_id", contractId)
      .maybeSingle();
    if (focus?.section_position != null) {
      clauseQuery = clauseQuery.eq("section_position", focus.section_position);
    }
  } else {
    clauseQuery = clauseQuery.limit(CHAT_MAX_CLAUSES);
  }

  const lastUserMessage = messages[messages.length - 1].content;

  const [clausesResult, refs] = await Promise.all([
    clauseQuery,
    searchLegalCorpus(lastUserMessage, { topK: 6 }).catch((err) => {
      console.warn(
        "[chat] rag search failed, continuing without refs:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }),
  ]);

  if (clausesResult.error) {
    return NextResponse.json(
      { error: "clauses_query_failed", message: clausesResult.error.message },
      { status: 500 },
    );
  }

  const clauseRows = (clausesResult.data ?? []) as ClauseContextRow[];
  const clauseContext: ChatClauseContext[] = clauseRows.map((c) => ({
    id: c.id,
    section_title: c.section_title,
    clause_number: c.clause_number,
    clause_text: c.clause_text,
  }));

  const refBundle = buildRefBundle(refs);
  const systemPrompt = buildSystemPrompt({
    contractTitle: contract.title,
    clauses: clauseContext,
    refs: refBundle,
  });

  if (!tryAcquireSlot(user.id)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "too many concurrent chat streams",
      },
      { status: 429 },
    );
  }

  let slotReleased = false;
  const release = () => {
    if (!slotReleased) {
      slotReleased = true;
      releaseSlot(user.id);
    }
  };

  const upstreamController = new AbortController();
  if (req.signal) {
    req.signal.addEventListener("abort", () => upstreamController.abort(), {
      once: true,
    });
  }

  const allowedRefCount = refBundle.length;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sseEncode("refs", { refs: refBundle }));

      let accumulated = "";
      try {
        const client = await getAnthropicClient();
        const ai = client.messages.stream(
          {
            model: CHAT_MODEL,
            max_tokens: CHAT_MAX_TOKENS,
            // Cache the system block (clause context + verified refs). In a
            // multi-turn conversation the prefix is identical across turns, so
            // every follow-up reads it from cache at ~0.1× instead of re-billing
            // the full clause+refs context.
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: toAnthropicMessages(messages),
          },
          { signal: upstreamController.signal },
        );

        for await (const ev of ai) {
          if (
            ev.type === "content_block_delta" &&
            ev.delta?.type === "text_delta" &&
            typeof ev.delta.text === "string"
          ) {
            accumulated += ev.delta.text;
            controller.enqueue(
              sseEncode("delta", { text: ev.delta.text }),
            );
          }
        }

        const final = await ai.finalMessage();

        const unknown = findUnknownRefTokens(accumulated, allowedRefCount);
        if (unknown.length > 0) {
          console.warn(
            `[chat] unknown ref tokens emitted contract=${contractId} tokens=${unknown.join(",")}`,
          );
        }
        if (/legal\s+advice/i.test(accumulated)) {
          console.warn(
            `[chat] forbidden phrase 'legal advice' emitted contract=${contractId}`,
          );
        }

        controller.enqueue(
          sseEncode("done", { usage: final.usage ?? null }),
        );
      } catch (err) {
        const code =
          err instanceof ChatLlmUnavailableError
            ? "chat_unavailable"
            : "stream_failed";
        const message =
          err instanceof Error ? err.message : "unknown stream error";
        try {
          controller.enqueue(sseEncode("error", { code, message }));
        } catch {
          // Controller may already be closed; nothing to do.
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
        release();
      }
    },
    cancel() {
      upstreamController.abort();
      release();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS, status: 200 });
}
