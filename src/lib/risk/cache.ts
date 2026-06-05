import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeForKey } from "@/lib/ai/dedupe";
import { LLM_PARSE_FAILED_MARKER } from "./llm-analyzer";
import type { RiskAnalysisResult } from "./types";

// Cross-contract clause-analysis cache (migration 0012). Identical clause
// text+category, at a fixed analyzer version, is analyzed once and reused.
//
// Bump RISK_ANALYZER_VERSION whenever the risk prompt, model routing, rule
// engine, or merge logic changes in a way that should invalidate cached
// analyses — this guarantees the cache stays quality-neutral across deploys.
// v2: risk prompt gained an explicit risk-level rubric calibrating the
// medium/standard boundary (kills high-stakes-category over-flagging).
// v3: prompt now requires bracketing every statutory reference (the inline
// citation guard removes un-bracketed ones), and India rule packs were added —
// both change output, so pre-v3 cached grades must not be reused.
export const RISK_ANALYZER_VERSION = 3;

// Retention window — reads ignore anything older (DPDP 30-day posture).
const FRESH_MS = 30 * 24 * 60 * 60 * 1000;
const UNDEFINED_TABLE = "42P01"; // migration 0012 not applied
const UNDEFINED_COLUMN = "42703";

export function riskCacheKey(clauseText: string, category: string): string {
  const basis = `v${RISK_ANALYZER_VERSION}|${category}|${normalizeForKey(clauseText)}`;
  return createHash("sha256").update(basis).digest("hex");
}

// The risk fields independent of which clause id asked for them. On a cache hit
// we re-attach the requesting clause's id.
export type CachedRisk = Omit<RiskAnalysisResult, "clauseId">;

// Only cache genuine, complete LLM analyses — never a soft fallback (the model
// failed) or we'd pin a degraded result and reuse it forever. (Non-substantive
// clauses never reach the analysis path, so they can't appear here.)
export function isCacheable(result: RiskAnalysisResult): boolean {
  return !result.ruleIds.includes(LLM_PARSE_FAILED_MARKER);
}

export interface RiskCache {
  get(keys: readonly string[]): Promise<Map<string, CachedRisk>>;
  set(
    entries: ReadonlyArray<{ key: string; result: RiskAnalysisResult }>,
  ): Promise<void>;
}

// DB-backed cache. Every method is migration-tolerant and failure-tolerant: a
// missing table or any error degrades to an empty/no-op cache, so analysis never
// breaks on an un-migrated database — it just doesn't cache.
export function createRiskCache(client: SupabaseClient): RiskCache {
  return {
    async get(keys) {
      const out = new Map<string, CachedRisk>();
      const unique = [...new Set(keys)];
      if (unique.length === 0) return out;
      const since = new Date(Date.now() - FRESH_MS).toISOString();
      const { data, error } = await client
        .from("clause_analysis_cache")
        .select("cache_key, result")
        .in("cache_key", unique)
        .eq("analyzer_version", RISK_ANALYZER_VERSION)
        .gte("created_at", since);
      if (error) {
        if (error.code !== UNDEFINED_TABLE && error.code !== UNDEFINED_COLUMN) {
          console.warn(`[risk-cache] get failed: ${error.message}`);
        }
        return out; // cold cache
      }
      for (const row of (data ?? []) as Array<{ cache_key: string; result: CachedRisk }>) {
        out.set(row.cache_key, row.result);
      }
      return out;
    },
    async set(entries) {
      if (entries.length === 0) return;
      const seen = new Set<string>();
      const rows: Array<Record<string, unknown>> = [];
      for (const e of entries) {
        if (seen.has(e.key)) continue;
        seen.add(e.key);
        const { clauseId: _omit, ...rest } = e.result;
        rows.push({
          cache_key: e.key,
          analyzer_version: RISK_ANALYZER_VERSION,
          result: rest,
          model: null,
        });
      }
      const { error } = await client
        .from("clause_analysis_cache")
        .upsert(rows, { onConflict: "cache_key" });
      if (error && error.code !== UNDEFINED_TABLE && error.code !== UNDEFINED_COLUMN) {
        console.warn(`[risk-cache] set failed: ${error.message}`);
      }
    },
  };
}
