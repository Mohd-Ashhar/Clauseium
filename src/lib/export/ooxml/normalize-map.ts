// Reproduces ingestion/search-anchor `normalizeForAnchor` (soft-hyphen strip,
// curly-quote fold, whitespace collapse, trim) while recording, for each
// normalized character, the index of the source character it came from. This
// lets the engine match a stored anchor / clause text against the document's
// flattened text and map a hit back to exact run offsets.
//
// Invariant (covered by unit test): normalizeWithMap(s).norm === normalizeForAnchor(s).

export interface NormalizedMap {
  norm: string;
  // normToRaw[i] = index in the source string of the i-th normalized char.
  normToRaw: number[];
}

const SOFT_HYPHEN = "­";

export function normalizeWithMap(raw: string): NormalizedMap {
  const chars: string[] = [];
  const map: number[] = [];
  let pendingSpace = false;
  let started = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === SOFT_HYPHEN) continue;

    let c = ch;
    if (ch === "‘" || ch === "’") c = "'";
    else if (ch === "“" || ch === "”") c = '"';

    if (/\s/.test(c)) {
      if (started) pendingSpace = true; // collapse; drop leading whitespace
      continue;
    }

    if (pendingSpace) {
      chars.push(" ");
      map.push(i);
      pendingSpace = false;
    }
    chars.push(c);
    map.push(i);
    started = true;
  }
  // trailing pendingSpace intentionally dropped (trim)

  return { norm: chars.join(""), normToRaw: map };
}
