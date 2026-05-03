export interface Ranked<T> {
  id: string;
  item: T;
  rank: number;
}

export interface FusedRow<T> {
  id: string;
  item: T;
  semantic: number;
  lexical: number;
  fused: number;
}

export function rrfFuse<T>(
  semantic: Ranked<T>[],
  lexical: Ranked<T>[],
  k = 60,
): FusedRow<T>[] {
  const map = new Map<string, FusedRow<T>>();

  for (const r of semantic) {
    map.set(r.id, {
      id: r.id,
      item: r.item,
      semantic: 1 / (k + r.rank),
      lexical: 0,
      fused: 1 / (k + r.rank),
    });
  }
  for (const r of lexical) {
    const existing = map.get(r.id);
    const lex = 1 / (k + r.rank);
    if (existing) {
      existing.lexical = lex;
      existing.fused = existing.semantic + lex;
    } else {
      map.set(r.id, { id: r.id, item: r.item, semantic: 0, lexical: lex, fused: lex });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.fused - a.fused);
}
