import "server-only";
import pRetry, { AbortError } from "p-retry";
import type { ClassificationLabel } from "@/lib/classification/categories";
import type { LegalReference } from "@/lib/rag/types";
import { llmRiskResponseSchema, type LlmRiskResponse } from "./schemas";
import { RISK_SYSTEM_PROMPT, buildRiskUserPrompt } from "./prompts";
import type { RuleFinding } from "./types";

export const RISK_ANALYZER_MODEL = "claude-haiku-4-5-20251001";

// Marker pushed onto `risk_rule_ids` when we exhaust retries and fall back
// to the "Manual review recommended" payload. The admin re-analyze endpoint
// uses this (plus a substring match on the legacy issue text) to find rows
// worth retrying.
export const LLM_PARSE_FAILED_MARKER = "LLM_PARSE_FAILED";

let _client: unknown = null;
let _envWarned = false;

export interface LlmAnalyzeOptions {
  signal?: AbortSignal;
}

export interface LlmAnalyzeInput {
  category: ClassificationLabel;
  clauseId?: string; // Optional, used for structured warn logging.
  clauseText: string;
  ruleFindings: readonly RuleFinding[];
  ragContext: readonly LegalReference[];
}

export interface LlmAnalyzeResult {
  response: LlmRiskResponse;
  model: string;
  // True when the model's structured output failed our schema after all
  // retries and we returned the soft fallback. The orchestrator stamps a
  // marker onto risk_rule_ids so an admin endpoint can re-run these later.
  failedToParse?: boolean;
}

export class RiskLlmUnavailableError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set; risk LLM analyzer disabled");
    this.name = "RiskLlmUnavailableError";
  }
}

// Surfaces a parse-time failure (model didn't call the tool, or its input
// didn't match the schema). We DON'T retry these — p-retry would just burn
// API calls reproducing the same confusion. Caller falls through to the
// soft "Manual review recommended" payload.
class RiskParseError extends Error {
  constructor(
    public readonly code: "no_tool_call" | "schema_mismatch",
    message: string,
    public readonly rawSample: string,
  ) {
    super(message);
    this.name = "RiskParseError";
  }
}

// Anthropic tool definition. The input_schema MUST match
// llmRiskResponseSchema so the model is forced to produce something we can
// safeParse. tool_choice forces this exact tool to be called — eliminates
// the "model returned prose instead of JSON" failure mode entirely.
const RISK_TOOL = {
  name: "submit_risk_analysis",
  description:
    "Submit a structured risk analysis for the clause. Call this tool exactly once with your analysis.",
  input_schema: {
    type: "object",
    properties: {
      risk_level: {
        type: "string",
        enum: ["high", "medium", "low", "standard", "missing"],
        description:
          "Overall risk level for this clause against Indian commercial norms.",
      },
      issue: {
        type: "string",
        description:
          "One-line problem statement. Aim for ~140 chars.",
      },
      explanation: {
        type: "string",
        description:
          "Legal reasoning. Aim for ~500 chars. MUST include at least one [CITE: <act> | <section> | <year>] token when risk_level is high or medium.",
      },
      suggestion: {
        type: "string",
        description:
          "Actionable redline text. Aim for ~350 chars. Empty string when no redline is recommended.",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Model confidence in the assessment, 0 to 1.",
      },
    },
    required: ["risk_level", "issue", "explanation", "suggestion", "confidence"],
  },
} as const;

const FALLBACK_RESPONSE: LlmRiskResponse = {
  risk_level: "standard",
  issue: "Manual review recommended",
  explanation:
    "Automated analysis was inconclusive for this clause. Please review manually against your playbook.",
  suggestion: "",
  confidence: 0.3,
};

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

  try {
    // p-retry only retries transient failures (network / 5xx / rate limit).
    // Parse errors are wrapped in AbortError inside callAnalyzer so p-retry
    // unwraps and surfaces the RiskParseError immediately without retrying.
    const response = await pRetry(
      async () => callAnalyzer(client, userText, opts.signal),
      {
        retries: 2,
        factor: 2,
        minTimeout: 500,
        maxTimeout: 3000,
        ...(opts.signal ? { signal: opts.signal } : {}),
      },
    );
    return { response, model: RISK_ANALYZER_MODEL };
  } catch (err) {
    if (err instanceof RiskParseError) {
      console.warn(
        `[risk] parse-fail clause=${input.clauseId ?? "?"} code=${err.code} sample=${err.rawSample.slice(0, 500)}`,
      );
    } else {
      console.warn(
        `[risk] llm-fail clause=${input.clauseId ?? "?"} error=${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return {
      response: FALLBACK_RESPONSE,
      model: RISK_ANALYZER_MODEL,
      failedToParse: true,
    };
  }
}

async function callAnalyzer(
  client: AnthropicMessagesAPI,
  userText: string,
  signal?: AbortSignal,
): Promise<LlmRiskResponse> {
  // Network / 5xx / rate-limit errors fall through to p-retry. Parse
  // errors are wrapped in AbortError below so p-retry short-circuits.
  const message = await client.messages.create(
    {
      model: RISK_ANALYZER_MODEL,
      // max_tokens needs comfortable headroom for the tool_use JSON, which
      // includes the entire structured response. 600 was too tight: the
      // model occasionally writes long explanations and gets truncated
      // mid-string, returning partial JSON that fails schema validation.
      // 1500 covers the worst-case verbose case while keeping latency low.
      max_tokens: 1500,
      temperature: 0,
      system: [
        {
          type: "text",
          text: RISK_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
      tools: [RISK_TOOL],
      // Force the model to call submit_risk_analysis. Anthropic
      // guarantees the response contains exactly one tool_use block.
      tool_choice: { type: "tool", name: RISK_TOOL.name },
    },
    signal ? { signal } : undefined,
  );

  const toolBlock = findToolUse(message);
  if (!toolBlock) {
    throw new AbortError(
      new RiskParseError(
        "no_tool_call",
        "Model did not produce a tool_use block",
        rawSample(message),
      ),
    );
  }

  const parsed = llmRiskResponseSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    // Capture the specific Zod issues so we can see which field rejected
    // (length, missing required, wrong type, etc.) and the raw shape of
    // the model's input. Earlier this was a black box.
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}:${i.message}`)
      .join(" | ");
    const inputDump = JSON.stringify(toolBlock.input ?? {});
    throw new AbortError(
      new RiskParseError(
        "schema_mismatch",
        `${issues} :: ${inputDump.slice(0, 300)}${inputDump.length > 300 ? "…" : ""}`,
        inputDump,
      ),
    );
  }
  return parsed.data;
}

interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

interface AnthropicLikeMessage {
  content: Array<{
    type: string;
    text?: string;
    name?: string;
    input?: unknown;
  }>;
}

function findToolUse(message: unknown): ToolUseBlock | null {
  const m = message as AnthropicLikeMessage;
  if (!m?.content || !Array.isArray(m.content)) return null;
  for (const block of m.content) {
    if (block.type === "tool_use" && block.name === RISK_TOOL.name) {
      return block as ToolUseBlock;
    }
  }
  return null;
}

function rawSample(message: unknown): string {
  const m = message as AnthropicLikeMessage;
  if (!m?.content || !Array.isArray(m.content)) return "";
  const text = m.content
    .map((b) =>
      b.type === "text" && typeof b.text === "string"
        ? b.text
        : b.type === "tool_use"
          ? `[tool_use ${b.name}: ${JSON.stringify(b.input ?? {})}]`
          : `[${b.type}]`,
    )
    .join(" ");
  return text.slice(0, 500);
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
