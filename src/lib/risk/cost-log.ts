import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Permanent, opt-in per-call cost observability (migration 0013_llm_call_log).
// Gated by RISK_COST_LOG=1; OFF by default. Stores ONLY cost metadata + token
// counts (never clause text), is fire-and-forget (never blocks or fails the
// analysis path), and is migration-tolerant (a missing table/column is a silent
// no-op). This is a PERMANENT structured table — not the throwaway console
// instrumentation used in past one-off cost tests.

const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";

export type LlmCallMethod =
  | "realtime"
  | "cascade_cheap"
  | "cascade_escalate"
  | "batch"
  | "doc"
  | "classify"
  | "cache_hit";

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface LlmCallLogRow {
  contractId?: string | null;
  model: string;
  category?: string | null;
  method: LlmCallMethod;
  usage?: Partial<LlmUsage> | null;
  cacheHit?: boolean;
  semdedupCollapsed?: boolean;
}

export function isCostLogEnabled(): boolean {
  return process.env.RISK_COST_LOG === "1";
}

// Pull the token counts off an Anthropic message's `usage` block, tolerating
// missing fields (they vary by SDK version and between the real-time and batch
// surfaces). Returns all-zero usage when nothing is present.
export function extractUsage(usage: unknown): LlmUsage {
  const u = (usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;
  return {
    inputTokens: num(u.input_tokens),
    outputTokens: num(u.output_tokens),
    cacheReadTokens: num(u.cache_read_input_tokens),
    cacheCreationTokens: num(u.cache_creation_input_tokens),
  };
}

let _warned = false;

// Fire-and-forget log of one LLM call. Safe to await or to drop on the floor.
export async function logLlmCall(row: LlmCallLogRow): Promise<void> {
  if (!isCostLogEnabled()) return;
  try {
    const client = createServiceRoleClient();
    const usage = row.usage ?? {};
    const { error } = await client.from("llm_call_log").insert({
      contract_id: row.contractId ?? null,
      model: row.model,
      category: row.category ?? null,
      method: row.method,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      cache_read_tokens: usage.cacheReadTokens ?? 0,
      cache_creation_tokens: usage.cacheCreationTokens ?? 0,
      cache_hit: row.cacheHit ?? false,
      semdedup_collapsed: row.semdedupCollapsed ?? false,
    });
    if (
      error &&
      error.code !== UNDEFINED_TABLE &&
      error.code !== UNDEFINED_COLUMN &&
      !_warned
    ) {
      _warned = true;
      console.warn(`[cost-log] insert failed (suppressing further): ${error.message}`);
    }
  } catch {
    /* best-effort: never block or fail analysis */
  }
}
