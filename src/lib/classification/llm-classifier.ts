import "server-only";
import {
  llmClassificationResponseSchema,
  type LlmClassificationResponse,
} from "./schemas";
import type { RuleClassification } from "./rule-classifier";

export const CLASSIFIER_MODEL = "claude-haiku-4-5-20251001";

const MAX_INPUT_CHARS = 3000;
const HEAD_CHARS = 2000;
const TAIL_CHARS = 1000;

const SYSTEM_PROMPT = `You classify clauses from Indian commercial contracts into exactly one category.
Categories:
- indemnification — promises to indemnify, defend, hold harmless
- limitation_of_liability — caps, exclusions of consequential damages
- termination — for cause/convenience, notice periods, survival
- governing_law — which law governs (laws of India, ICA 1872)
- jurisdiction — courts, forum, venue (Bombay HC, Delhi HC, exclusive jurisdiction)
- data_protection_dpdp — DPDP Act 2023, data fiduciary, consent, data principal, SPDI Rules
- payment_terms — invoicing, due dates, late fees, GST, TDS
- ip_assignment — assignment/ownership of IP, work-for-hire, moral rights waiver
- other — only when none of the above clearly applies

Indian-law context: Indian Contract Act 1872, DPDP Act 2023, SPDI Rules 2011,
Arbitration & Conciliation Act 1996, Companies Act 2013, IT Act 2000.

Output STRICT JSON with no preamble, code fences, or trailing text:
{"category": "<one>", "confidence": 0..1, "reasoning": "<=120 chars"}`;

let _client: unknown = null;
let _envChecked = false;
let _envWarned = false;

export interface LlmClassifierOptions {
  signal?: AbortSignal;
}

export interface LlmInvocationResult {
  response: LlmClassificationResponse;
  model: string;
}

export class LlmUnavailableError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set; LLM fallback disabled");
    this.name = "LlmUnavailableError";
  }
}

export function isLlmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function classifyByLlm(
  clauseText: string,
  ruleContext: RuleClassification,
  opts: LlmClassifierOptions = {},
): Promise<LlmInvocationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (!_envWarned) {
      console.warn(
        "[classification] ANTHROPIC_API_KEY missing — running in rule-only mode",
      );
      _envWarned = true;
    }
    _envChecked = true;
    throw new LlmUnavailableError();
  }
  _envChecked = true;

  const client = await getClient(apiKey);
  const userText = buildUserPrompt(clauseText, ruleContext);

  const message = await client.messages.create(
    {
      model: CLASSIFIER_MODEL,
      max_tokens: 200,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    },
    opts.signal ? { signal: opts.signal } : undefined,
  );

  const raw = extractText(message);
  const json = safeParseJson(raw);
  const parsed = llmClassificationResponseSchema.safeParse(json);

  if (!parsed.success) {
    return {
      response: {
        category: "other",
        confidence: 0.3,
        reasoning: "llm response failed schema validation",
      },
      model: CLASSIFIER_MODEL,
    };
  }

  return { response: parsed.data, model: CLASSIFIER_MODEL };
}

function buildUserPrompt(
  clauseText: string,
  ctx: RuleClassification,
): string {
  const top = ctx.top
    ? `top=${ctx.top.category} score=${ctx.top.score.toFixed(2)}`
    : "top=none";
  const runner = ctx.runnerUp
    ? `runner_up=${ctx.runnerUp.category} score=${ctx.runnerUp.score.toFixed(2)}`
    : "runner_up=none";

  const truncated = truncate(clauseText);

  return `Rule hints: ${top} ${runner}
Clause:
"""
${truncated}
"""
JSON:`;
}

function truncate(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_INPUT_CHARS) return t;
  const head = t.slice(0, HEAD_CHARS);
  const tail = t.slice(-TAIL_CHARS);
  return `${head}\n…[truncated]…\n${tail}`;
}

interface AnthropicLikeMessage {
  content: Array<{ type: string; text?: string }>;
}

function extractText(message: unknown): string {
  const m = message as AnthropicLikeMessage;
  if (!m?.content || !Array.isArray(m.content)) return "";
  return m.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

function safeParseJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Tolerate accidental code fences.
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(stripped);
  } catch {
    // Try to extract first {...} block.
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

interface AnthropicMessagesAPI {
  messages: {
    create: (
      params: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => Promise<unknown>;
  };
}

async function getClient(apiKey: string): Promise<AnthropicMessagesAPI> {
  if (_client) return _client as AnthropicMessagesAPI;
  const mod = (await import("@anthropic-ai/sdk")) as unknown as {
    default: new (cfg: { apiKey: string }) => AnthropicMessagesAPI;
  };
  _client = new mod.default({ apiKey });
  return _client as AnthropicMessagesAPI;
}

// Test seam: reset cached client between tests.
export function _resetForTests(): void {
  _client = null;
  _envChecked = false;
  _envWarned = false;
}
