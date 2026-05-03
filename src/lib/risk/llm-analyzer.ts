import "server-only";
import type { ClassificationLabel } from "@/lib/classification/categories";
import type { LegalReference } from "@/lib/rag/types";
import { llmRiskResponseSchema, type LlmRiskResponse } from "./schemas";
import { RISK_SYSTEM_PROMPT, buildRiskUserPrompt } from "./prompts";
import type { RuleFinding } from "./types";

export const RISK_ANALYZER_MODEL = "claude-haiku-4-5-20251001";

let _client: unknown = null;
let _envWarned = false;

export interface LlmAnalyzeOptions {
  signal?: AbortSignal;
}

export interface LlmAnalyzeInput {
  category: ClassificationLabel;
  clauseText: string;
  ruleFindings: readonly RuleFinding[];
  ragContext: readonly LegalReference[];
}

export interface LlmAnalyzeResult {
  response: LlmRiskResponse;
  model: string;
}

export class RiskLlmUnavailableError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set; risk LLM analyzer disabled");
    this.name = "RiskLlmUnavailableError";
  }
}

export function isRiskLlmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function analyzeByLlm(
  input: LlmAnalyzeInput,
  opts: LlmAnalyzeOptions = {},
): Promise<LlmAnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (!_envWarned) {
      console.warn(
        "[risk] ANTHROPIC_API_KEY missing — running in rule-only mode",
      );
      _envWarned = true;
    }
    throw new RiskLlmUnavailableError();
  }

  const client = await getClient(apiKey);
  const userText = buildRiskUserPrompt(input);

  const message = await client.messages.create(
    {
      model: RISK_ANALYZER_MODEL,
      max_tokens: 600,
      temperature: 0,
      system: [
        {
          type: "text",
          text: RISK_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    },
    opts.signal ? { signal: opts.signal } : undefined,
  );

  const raw = extractText(message);
  const json = safeParseJson(raw);
  const parsed = llmRiskResponseSchema.safeParse(json);

  if (!parsed.success) {
    return {
      response: {
        risk_level: "standard",
        issue: "Risk analyzer returned an unparseable response.",
        explanation:
          "The legal analysis model produced output that did not match the expected schema; defaulting to standard pending re-analysis.",
        suggestion: "",
        confidence: 0.3,
      },
      model: RISK_ANALYZER_MODEL,
    };
  }

  return { response: parsed.data, model: RISK_ANALYZER_MODEL };
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
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(stripped);
  } catch {
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
    default: new (cfg: { apiKey: string; baseURL?: string }) => AnthropicMessagesAPI;
  };
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  _client = baseURL
    ? new mod.default({ apiKey, baseURL })
    : new mod.default({ apiKey });
  return _client as AnthropicMessagesAPI;
}

// Test seam: reset cached client between tests.
export function _resetForTests(): void {
  _client = null;
  _envWarned = false;
}
