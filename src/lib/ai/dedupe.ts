// Content-dedup helpers shared by the risk and classification orchestrators.
// Long contracts repeat boilerplate verbatim (notice blocks, definitions,
// schedule headers). Since both analyzers are deterministic on their input
// (temperature 0, same prompt), identical inputs produce identical output — so
// we analyze each unique input ONCE and broadcast the result to its duplicates.
// Pure functions, no server-only deps, so they're trivially unit-testable.

// Group items by a content key, preserving first-seen order of both the groups
// and the members within each group.
export function groupByKey<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()];
}

// Whitespace- and case-insensitive key for clause text. Deliberately simple: it
// only needs to make verbatim/near-verbatim duplicates collide, and must never
// merge clauses that differ in substance.
export function normalizeForKey(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
