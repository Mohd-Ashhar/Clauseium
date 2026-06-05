import "server-only";
import {
  buildRiskRequestParams,
  getRiskBatchClient,
  parseRiskMessage,
  type LlmAnalyzeInput,
  type RiskBatchClient,
} from "./llm-analyzer";
import type { LlmRiskResponse } from "./schemas";

// Anthropic Message Batches path for the per-clause risk analyzer (~50% cheaper
// than real-time, identical model/prompt/output). Opt-in via RISK_USE_BATCH; the
// orchestrator falls back to real-time for anything this can't deliver, so it is
// always safe.

export interface BatchItem {
  customId: string;
  input: LlmAnalyzeInput;
}

export interface BatchOutcome {
  response: LlmRiskResponse;
  model: string;
}

export interface RunBatchOptions {
  maxWaitMs?: number;
  pollMs?: number;
  signal?: AbortSignal;
  // Called on each poll tick — the orchestrator wires this to its DB heartbeat
  // so a long batch wait doesn't look "stuck" to the status-route reclaim.
  onPoll?: () => void;
  // Injectable for tests; defaults to the shared SDK client.
  client?: RiskBatchClient;
}

const DEFAULT_MAX_WAIT_MS = 4 * 60 * 1000; // stay within the process window
const DEFAULT_POLL_MS = 5000;

export function readBatchMaxWaitMs(): number {
  const raw = process.env.RISK_BATCH_MAX_WAIT_MS;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_WAIT_MS;
}

export function isBatchEnabled(): boolean {
  return process.env.RISK_USE_BATCH === "1";
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

// Submit a risk batch and poll to completion (bounded). Returns a map of
// customId → parsed outcome for requests that SUCCEEDED and parsed. Anything
// that errored/expired/didn't-parse, or a whole batch that times out, is simply
// ABSENT from the map — the caller real-times those, so this never loses a
// clause and never throws on a batch-level problem.
export async function runRiskBatch(
  items: readonly BatchItem[],
  opts: RunBatchOptions = {},
): Promise<Map<string, BatchOutcome>> {
  const out = new Map<string, BatchOutcome>();
  if (items.length === 0) return out;

  const maxWaitMs = opts.maxWaitMs ?? readBatchMaxWaitMs();
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;

  let client: RiskBatchClient;
  try {
    client = opts.client ?? (await getRiskBatchClient());
  } catch {
    return out; // no client/key → caller real-times everything
  }

  const modelByCustomId = new Map<string, string>();
  const requests = items.map((it) => {
    const { model, params } = buildRiskRequestParams(it.input);
    modelByCustomId.set(it.customId, model);
    return { custom_id: it.customId, params };
  });

  try {
    const batch = await client.messages.batches.create({ requests });
    const deadline = Date.now() + maxWaitMs;
    let status = batch.processing_status;

    while (status !== "ended") {
      if (Date.now() > deadline || opts.signal?.aborted) {
        // Stop waiting. Cancel so we don't keep paying for unprocessed requests,
        // then briefly poll for 'ended' to collect whatever already finished.
        try { await client.messages.batches.cancel(batch.id); } catch { /* ignore */ }
        const tail = Date.now() + Math.min(30_000, pollMs * 4);
        while (status !== "ended" && Date.now() < tail) {
          await delay(pollMs, opts.signal);
          try {
            status = (await client.messages.batches.retrieve(batch.id)).processing_status;
          } catch {
            break;
          }
        }
        break;
      }
      await delay(pollMs, opts.signal);
      opts.onPoll?.();
      try {
        status = (await client.messages.batches.retrieve(batch.id)).processing_status;
      } catch {
        return out; // can't poll → caller real-times everything
      }
    }

    if (status !== "ended") return out; // never reached completion

    const results = await client.messages.batches.results(batch.id);
    for await (const r of results) {
      if (r.result?.type === "succeeded" && r.result.message) {
        const parsed = parseRiskMessage(r.result.message);
        if (parsed) {
          out.set(r.custom_id, {
            response: parsed,
            model: modelByCustomId.get(r.custom_id) ?? "",
          });
        }
      }
    }
  } catch {
    // Any batch-level failure → return whatever we have; caller real-times the rest.
    return out;
  }

  return out;
}
