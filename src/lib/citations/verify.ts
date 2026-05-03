import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkLocal, type LocalCheckDeps } from "./local-check";
import { checkKanoon } from "./indian-kanoon";
import type {
  ExtractedCitation,
  SourceCheck,
  VerificationResult,
} from "./types";
import type { CitationStatusValue } from "./schemas";

export const RELEVANCE_VERIFIED = 0.55;
export const RELEVANCE_PARTIAL = 0.35;

export interface VerifyDeps {
  supabase: SupabaseClient;
  clauseEmbedding: number[] | null;
  fetchImpl?: typeof fetch;
}

export interface VerifyOneOptions {
  signal?: AbortSignal;
  perCallTimeoutMs?: number;
}

export async function verifyOne(
  citation: ExtractedCitation,
  deps: VerifyDeps,
  opts: VerifyOneOptions = {},
): Promise<VerificationResult> {
  const timeoutMs = opts.perCallTimeoutMs ?? 4000;

  const localPromise = wrapTimeout(
    checkLocal(citation, mapLocalDeps(deps), opts.signal),
    timeoutMs,
    "local timeout",
  );
  const kanoonPromise = wrapTimeout(
    checkKanoon(citation, {
      signal: opts.signal,
      fetchImpl: deps.fetchImpl,
      timeoutMs,
    }),
    timeoutMs,
    "kanoon timeout",
  );

  const [localSettled, kanoonSettled] = await Promise.allSettled([
    localPromise,
    kanoonPromise,
  ]);

  const local = unwrap(localSettled, "local");
  const kanoon = unwrap(kanoonSettled, "kanoon");

  const status = decideStatus(citation, local, kanoon);
  const confidence = computeConfidence(citation, local, kanoon, status);
  const sourceUrl = local.url ?? kanoon.url;

  return {
    citation,
    status,
    sourceUrl,
    confidence: round3(confidence),
    local,
    kanoon,
  };
}

function decideStatus(
  citation: ExtractedCitation,
  local: SourceCheck,
  kanoon: SourceCheck,
): CitationStatusValue {
  if (!citation.formatValid) return "unverified";

  const localOk = local.checked && local.confirmed;
  const kanoonOk = kanoon.checked && kanoon.confirmed;
  const relevance = local.relevance;

  if (localOk && kanoonOk) {
    if (relevance >= RELEVANCE_VERIFIED) return "verified";
    if (relevance >= RELEVANCE_PARTIAL) return "partially_verified";
    return "partially_verified";
  }

  if (localOk || kanoonOk) {
    if (localOk && relevance >= RELEVANCE_PARTIAL) return "partially_verified";
    if (kanoonOk) return "partially_verified";
    return "unverified";
  }

  return "unverified";
}

function computeConfidence(
  citation: ExtractedCitation,
  local: SourceCheck,
  kanoon: SourceCheck,
  status: CitationStatusValue,
): number {
  if (status === "unverified") return 0;

  const localOk = local.checked && local.confirmed;
  const kanoonOk = kanoon.checked && kanoon.confirmed;
  const both = localOk && kanoonOk;
  const sourceAgreement = both ? 1 : localOk || kanoonOk ? 0.5 : 0;

  // If we don't have a clause embedding, relevance is neutral; weight stays the same.
  const relevance = localOk ? local.relevance : 0.5;
  const formatValid = citation.formatValid ? 1 : 0;

  return 0.5 * sourceAgreement + 0.4 * relevance + 0.1 * formatValid;
}

function mapLocalDeps(deps: VerifyDeps): LocalCheckDeps {
  return { supabase: deps.supabase, clauseEmbedding: deps.clauseEmbedding };
}

function unwrap(
  settled: PromiseSettledResult<SourceCheck>,
  source: "local" | "kanoon",
): SourceCheck {
  if (settled.status === "fulfilled") return settled.value;
  const message =
    settled.reason instanceof Error
      ? settled.reason.message
      : String(settled.reason);
  return {
    checked: source === "kanoon", // local never throws normally
    confirmed: false,
    relevance: 0,
    latencyMs: 0,
    error: message.slice(0, 200),
  };
}

function wrapTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms + 250);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
