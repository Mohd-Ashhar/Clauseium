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

// A confirmed EXACT corpus match is our source of truth (CLAUDE.md mandates
// "verified against our corpus"). Relevance is a confidence signal, NOT a hard
// gate — it can only DEMOTE an exact match, and only on strong, measured
// evidence of topic mismatch (below this floor). Indian Kanoon is optional
// corroboration that boosts confidence, never a requirement for "verified".
export const RELEVANCE_DEMOTE_FLOOR = 0.35;
// A fuzzy (hybrid-search) hit is weaker — it must clear this measured relevance,
// or be corroborated by Kanoon, to reach "verified".
export const RELEVANCE_HYBRID_VERIFIED = 0.55;
// Mirror of local-check's NEUTRAL_RELEVANCE: a relevance of exactly 0.5 means
// "no embedding available" (unmeasured), not a real low score. We never demote
// on it — that would wrongly punish legitimate matches whose chunk had no
// embedding.
export const NEUTRAL_RELEVANCE = 0.5;

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
  const exact = localOk && local.exactMatch === true;
  const relevance = local.relevance;
  // "measured" = embeddings were actually present (not the 0.5 neutral fallback).
  const measured = relevance !== NEUTRAL_RELEVANCE;

  // Exact curated-corpus hit: the corpus IS our source of truth. Verified unless
  // there is STRONG, measured evidence the citation is off-topic for this clause
  // (the P2-1 mismatch guard) — never demoted on the neutral 0.5 fallback.
  if (exact) {
    if (measured && relevance < RELEVANCE_DEMOTE_FLOOR) return "partially_verified";
    return "verified";
  }

  // Fuzzy (hybrid-search) corpus hit: weaker — needs measured relevance or an
  // independent Kanoon corroboration to reach verified.
  if (localOk) {
    if (measured && relevance >= RELEVANCE_HYBRID_VERIFIED) return "verified";
    if (kanoonOk) return "verified";
    return "partially_verified";
  }

  // No local corpus hit — Kanoon alone is never "verified".
  if (kanoonOk) return "partially_verified";
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
  const exact = localOk && local.exactMatch === true;

  // Corpus base signal: an exact curated hit is near-certain; a fuzzy hit is
  // solid; Kanoon-only (no corpus) is weak.
  const corpusBase = exact ? 0.85 : localOk ? 0.6 : 0.4;
  // Relevance contributes only when measured; the neutral 0.5 neither helps nor
  // hurts.
  const relevance = localOk ? local.relevance : NEUTRAL_RELEVANCE;
  // Kanoon corroboration is a bonus, never a requirement.
  const kanoonBoost = kanoonOk ? 0.1 : 0;
  const formatValid = citation.formatValid ? 1 : 0;

  const raw =
    0.6 * corpusBase + 0.3 * relevance + 0.1 * formatValid + kanoonBoost;
  return Math.max(0, Math.min(1, raw));
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
