import "server-only";
import pRetry, { AbortError } from "p-retry";
import { canonicalize, jaccard } from "./normalize";
import { LruCache } from "./lru-cache";
import type { ExtractedCitation, SourceCheck } from "./types";

export const KANOON_BASE_URL = "https://api.indiankanoon.org";
export const TITLE_MATCH_THRESHOLD = 0.7;

export class IndianKanoonUnavailableError extends Error {
  constructor() {
    super("INDIAN_KANOON_API_TOKEN not set; external verification disabled");
    this.name = "IndianKanoonUnavailableError";
  }
}

interface KanoonHit {
  tid: string | number;
  title: string;
  doc_size?: number;
  publishdate?: string;
}

interface KanoonSearchResponse {
  docs?: KanoonHit[];
  found?: string | number;
}

interface CachedResult {
  confirmed: boolean;
  url?: string;
  title?: string;
}

const cache = new LruCache<CachedResult>({ maxSize: 500 });

let _envWarned = false;

export function isKanoonAvailable(): boolean {
  return Boolean(process.env.INDIAN_KANOON_API_TOKEN);
}

export interface KanoonCheckOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function checkKanoon(
  citation: ExtractedCitation,
  opts: KanoonCheckOptions = {},
): Promise<SourceCheck> {
  const start = Date.now();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 4000;

  if (!citation.formatValid) {
    return {
      checked: true,
      confirmed: false,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: "format invalid",
    };
  }

  const token = process.env.INDIAN_KANOON_API_TOKEN;
  if (!token) {
    if (!_envWarned) {
      console.warn(
        "[citations] INDIAN_KANOON_API_TOKEN missing — pipeline degraded to local-only",
      );
      _envWarned = true;
    }
    return {
      checked: false,
      confirmed: false,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: "unavailable",
    };
  }

  const query = buildQuery(citation);
  const cacheKey = canonicalize(query);
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      checked: true,
      confirmed: cached.confirmed,
      url: cached.url,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: null,
      cacheHit: true,
    };
  }

  try {
    const result = await pRetry(
      async () => {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);
        const onParentAbort = () => ac.abort();
        opts.signal?.addEventListener("abort", onParentAbort);
        try {
          const url = `${KANOON_BASE_URL}/search/?formInput=${encodeURIComponent(query)}`;
          const resp = await fetchImpl(url, {
            method: "POST",
            headers: {
              Authorization: `Token ${token}`,
              Accept: "application/json",
            },
            signal: ac.signal,
          });
          if (resp.status >= 400 && resp.status < 500) {
            // Client errors are not retryable.
            throw new AbortError(`kanoon ${resp.status}`);
          }
          if (!resp.ok) {
            throw new Error(`kanoon ${resp.status}`);
          }
          const json = (await resp.json()) as KanoonSearchResponse;
          return matchHit(citation, json);
        } finally {
          clearTimeout(timer);
          opts.signal?.removeEventListener("abort", onParentAbort);
        }
      },
      { retries: 2, factor: 2, minTimeout: 300, maxTimeout: 1500 },
    );

    cache.set(cacheKey, result);

    return {
      checked: true,
      confirmed: result.confirmed,
      url: result.url,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: null,
      cacheHit: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      checked: true,
      confirmed: false,
      relevance: 0,
      latencyMs: Date.now() - start,
      error: message.slice(0, 200),
    };
  }
}

function buildQuery(citation: ExtractedCitation): string {
  const parts = [citation.caseOrStatute, citation.sectionOrCitation];
  if (citation.year !== null) parts.push(String(citation.year));
  return parts.join(" ");
}

function matchHit(
  citation: ExtractedCitation,
  json: KanoonSearchResponse,
): CachedResult {
  const docs = json.docs ?? [];
  const target = `${citation.caseOrStatute} ${citation.sectionOrCitation}`;
  let best: { hit: KanoonHit; score: number } | null = null;
  for (const hit of docs) {
    const score = jaccard(target, hit.title ?? "");
    if (!best || score > best.score) best = { hit, score };
  }
  if (!best || best.score < TITLE_MATCH_THRESHOLD) {
    return { confirmed: false };
  }
  return {
    confirmed: true,
    url: `https://indiankanoon.org/doc/${best.hit.tid}/`,
    title: best.hit.title,
  };
}

// Test seam.
export function _resetCacheForTests(): void {
  cache.clear();
  _envWarned = false;
}
