/**
 * One-shot maintenance script: rewrite stale per-section URLs persisted on
 * `clauses.citations[]`.
 *
 *   npm run backfill:citation-urls
 *
 * History: earlier seed JSONs carried act-level indiacode.nic.in/handle URLs
 * that 504 from Akamai. The pipeline now persists per-section Indian Kanoon
 * URLs, but historical rows still hold the broken URL. This script walks every
 * clause whose citations array references a known-bad host (or has a missing
 * URL we can now resolve) and rewrites the JSONB element in place using the
 * seed JSON's section_urls map.
 *
 * Idempotent — second run reports zero rewrites.
 */

import { readdir, readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canonicalize,
  extractSectionNumber,
  jaccard,
} from "@/lib/citations/normalize";
import { seedSchema, type StatuteSeed } from "@/lib/rag/types";

const PAGE_SIZE = 200;
const STALE_HOST_PATTERN = /https?:\/\/(www\.)?indiacode\.nic\.in\/handle\//i;

interface CitationPill {
  id?: string;
  text?: string;
  source?: string;
  section?: string;
  status?: string;
  url?: string;
  warning?: string;
}

interface ClauseRow {
  id: string;
  citations: CitationPill[] | null;
}

async function loadStatuteSeeds(dir: string): Promise<StatuteSeed[]> {
  const abs = resolvePath(process.cwd(), dir);
  const entries = await readdir(abs);
  const out: StatuteSeed[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const raw = await readFile(resolvePath(abs, name), "utf8");
    const parsed = seedSchema.parse(JSON.parse(raw));
    if (parsed.kind === "statute") out.push(parsed);
  }
  return out;
}

interface SeedIndex {
  // canonicalized statute name → seed
  byName: Map<string, StatuteSeed>;
}

function indexSeeds(seeds: readonly StatuteSeed[]): SeedIndex {
  const byName = new Map<string, StatuteSeed>();
  for (const s of seeds) {
    byName.set(canonicalize(s.statute_name), s);
  }
  return { byName };
}

function resolveSeed(
  index: SeedIndex,
  statuteName: string | undefined,
): StatuteSeed | null {
  if (!statuteName) return null;
  const target = canonicalize(statuteName);
  // exact alias-canonicalised match wins
  const direct = index.byName.get(target);
  if (direct) return direct;
  // jaccard fallback so "Indian Contract Act 1872" matches the seed name
  // "Indian Contract Act, 1872" and similar punctuation drift
  let best: { seed: StatuteSeed; score: number } | null = null;
  for (const [name, seed] of index.byName) {
    const score = jaccard(target, name);
    if (score >= 0.6 && (!best || score > best.score)) best = { seed, score };
  }
  return best?.seed ?? null;
}

function resolveUrl(
  seed: StatuteSeed,
  rawSection: string | undefined,
): string | null {
  if (!rawSection) return seed.url ?? null;
  const num = extractSectionNumber(rawSection);
  if (num && seed.section_urls?.[num]) return seed.section_urls[num];
  // try the bare key form too — rawSection might already be "73" or "s.73"
  for (const key of Object.keys(seed.section_urls ?? {})) {
    if (rawSection.includes(key)) return seed.section_urls![key];
  }
  return seed.url ?? null;
}

function shouldRewrite(pill: CitationPill): boolean {
  if (!pill.url) return true;
  if (STALE_HOST_PATTERN.test(pill.url)) return true;
  return false;
}

async function main(): Promise<void> {
  const seeds = await loadStatuteSeeds("data/legal-corpus");
  const index = indexSeeds(seeds);
  console.log(`loaded ${seeds.length} statute seed(s)`);

  const supa = createServiceRoleClient();

  let scanned = 0;
  let rewritten = 0;
  let skipped = 0;
  let unresolved = 0;
  let offset = 0;

  while (true) {
    const { data, error } = await supa
      .from("clauses")
      .select("id, citations")
      .not("citations", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`page fetch failed at offset ${offset}: ${error.message}`);
    }

    const rows = (data ?? []) as ClauseRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const citations = row.citations ?? [];
      if (citations.length === 0) {
        skipped += 1;
        continue;
      }

      let changed = false;
      const next: CitationPill[] = citations.map((pill) => {
        if (!shouldRewrite(pill)) return pill;
        const seed = resolveSeed(index, pill.source);
        if (!seed) {
          unresolved += 1;
          return pill;
        }
        const newUrl = resolveUrl(seed, pill.section);
        if (!newUrl || newUrl === pill.url) return pill;
        changed = true;
        return { ...pill, url: newUrl };
      });

      if (!changed) {
        skipped += 1;
        continue;
      }

      const upd = await supa
        .from("clauses")
        .update({ citations: next })
        .eq("id", row.id);
      if (upd.error) {
        console.error(`  ! update failed for clause ${row.id}: ${upd.error.message}`);
        continue;
      }
      rewritten += 1;
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(
    `done — scanned=${scanned}, rewritten=${rewritten}, skipped=${skipped}, unresolved=${unresolved}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
