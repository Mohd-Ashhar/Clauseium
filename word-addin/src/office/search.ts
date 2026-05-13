// Locate a clause's Word.Range inside the live document so we can scroll
// to it or replace it with a tracked-change redline.
//
// Anchor source: `clause.search_anchor` — a server-side normalized first-
// 150-chars fingerprint produced by migration 0008 + the ingestion
// normalizer (`/src/lib/ingestion/search-anchor.ts`). Already pre-trimmed
// of soft hyphens and curly quotes, and always ≤ 150 chars (well under
// Word's 255-char `body.search` ceiling).
//
// Collisions: when the same anchor matches multiple places in the doc
// (boilerplate phrases like "the parties agree", duplicate definitions),
// we disambiguate by finding the match whose containing paragraph index
// is closest to `clause.position` from the original parse. Falls back to
// the first match if we can't map paragraphs reliably.

import type { AnalysisClause } from "@addin/types/contract";

export type AnchorClause = Pick<AnalysisClause, "id" | "search_anchor" | "position">;

export interface SearchResult {
  range: Word.Range;
  // How many candidates we considered. 1 = unambiguous, >1 = disambiguated.
  matchCount: number;
}

export async function findClauseRange(
  ctx: Word.RequestContext,
  clause: AnchorClause,
): Promise<SearchResult | null> {
  const anchor = clause.search_anchor?.trim();
  if (!anchor) return null;

  const matches = ctx.document.body.search(anchor, {
    matchCase: false,
    ignorePunct: false,
    ignoreSpace: false,
  });
  matches.load("items");
  await ctx.sync();

  const total = matches.items.length;
  if (total === 0) return null;
  if (total === 1) {
    const first = matches.items[0];
    return first ? { range: first, matchCount: 1 } : null;
  }

  // Collision path. Load the parent-paragraph text of each match plus the
  // full ordered paragraph list, then pick the match whose paragraph index
  // is closest to clause.position.
  const matchParas = matches.items.map((m) => m.paragraphs.getFirst());
  for (const p of matchParas) p.load("text");
  const paragraphs = ctx.document.body.paragraphs;
  paragraphs.load("text");
  await ctx.sync();

  const targetPosition = clause.position ?? 0;

  // Build paragraph-text → index map. Identical paragraph texts collapse
  // to the first occurrence — fine for our disambiguation purpose since
  // identical paragraphs at different positions are semantically the same.
  const textToIndex = new Map<string, number>();
  for (let i = 0; i < paragraphs.items.length; i += 1) {
    const text = paragraphs.items[i]?.text;
    if (text && !textToIndex.has(text)) {
      textToIndex.set(text, i);
    }
  }

  let bestRange: Word.Range = matches.items[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < matches.items.length; i += 1) {
    const match = matches.items[i];
    const para = matchParas[i];
    if (!match || !para) continue;
    const idx = textToIndex.get(para.text) ?? -1;
    if (idx < 0) continue;
    const distance = Math.abs(idx - targetPosition);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestRange = match;
    }
  }

  return { range: bestRange, matchCount: total };
}
