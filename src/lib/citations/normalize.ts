// Aliases with optional trailing " act" so "DPDP" and "DPDP Act" both expand
// to a single canonical "digital personal data protection act" without doubling.
const STATUTE_ALIASES: Array<[RegExp, string]> = [
  [/\b(ica|i\.c\.a\.)(?:\s+act)?\b/gi, "indian contract act"],
  [/\b(dpdp|d\.p\.d\.p\.)(?:\s+act)?\b/gi, "digital personal data protection act"],
  [/\b(it act|i\.t\. act)\b/gi, "information technology act"],
  [/\b(arb(?:itration)?\.? act)\b/gi, "arbitration and conciliation act"],
  [/\b(cos\.? act|companies act)\b/gi, "companies act"],
  [/\b(fema)(?:\s+act)?\b/gi, "foreign exchange management act"],
  [/\b(stamp act)\b/gi, "indian stamp act"],
];

export function canonicalize(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/[“”"']/g, "");
  s = s.replace(/\s+/g, " ");
  s = s.replace(/[.,;:]+\s*$/g, "");
  s = s.replace(/\bs(?:ec|ection)?\.?\s+/gi, "section ");
  for (const [pattern, repl] of STATUTE_ALIASES) {
    s = s.replace(pattern, repl);
  }
  return s.trim();
}

export function tokens(input: string): string[] {
  return canonicalize(input)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

export function jaccard(a: string, b: string): number {
  const setA = new Set(tokens(a));
  const setB = new Set(tokens(b));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersect = 0;
  for (const t of setA) if (setB.has(t)) intersect += 1;
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

export function extractSectionNumber(s: string): string | null {
  // Match "section 73", "sec 73", "sec. 73", "s. 73", "s.73", "s 73"
  const prefixed = s.match(
    /\b(?:section|sec\.?|s\.?)\s*([0-9]+[a-z]?(?:\([0-9a-z]+\))?)/i,
  );
  if (prefixed) return prefixed[1].toLowerCase();
  const bare = s.match(/^\s*([0-9]+[a-z]?(?:\([0-9a-z]+\))?)\s*$/i);
  if (bare) return bare[1].toLowerCase();
  return null;
}

export function extractYear(s: string): number | null {
  const m = s.match(/\b(1[789]\d{2}|20\d{2})\b/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}
