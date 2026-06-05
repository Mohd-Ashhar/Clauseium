import "server-only";
import type { RuleFinding } from "./types";

// Semantic (near-duplicate) clause dedup — OPT-IN, conservative by design.
// The exact-text dedup (groupByKey/normalizeForKey) only collapses verbatim
// duplicates. This collapses clauses that are LEGALLY identical but not byte-
// identical (whitespace, a party name, a trivial rewording) so each is analyzed
// once and the result broadcast. To never merge legally-distinct clauses it
// requires ALL of: a very high raw-cosine similarity, the SAME category, and an
// IDENTICAL deterministic rule signature.

// Raw cosine similarity (NOT remapped to [0,1] like citations/relevance — we want
// the true cosine so a 0.97 threshold means what it says). text-embedding vectors
// are unit-normalized, so this is effectively a dot product.
export function cosineSim(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  const s = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Number.isFinite(s) ? s : 0;
}

// A stable signature of the deterministic rule findings on a clause. Two clauses
// only merge when their rule signatures match, so a rule-detectable difference
// (e.g. one has a carve-out the other lacks) always keeps them separate.
export function ruleSignature(findings: readonly RuleFinding[]): string {
  if (findings.length === 0) return "";
  return findings
    .map((f) => `${f.ruleId}:${f.level}`)
    .sort()
    .join("|");
}

export interface SemDedupRep {
  category: string;
  ruleSignature: string;
  embedding: readonly number[];
}

// Greedy single-link bucketing. Returns, for each rep, the index of its bucket's
// canonical (representative) rep — always <= the rep's own index, and equal to
// its own index for a bucket head. A rep joins the FIRST earlier bucket whose
// head it matches on (cosine >= threshold) AND (same category) AND (same rule
// signature); otherwise it starts a new bucket.
export function bucketReps(
  reps: readonly SemDedupRep[],
  threshold: number,
): number[] {
  const canonical = new Array<number>(reps.length);
  const heads: number[] = [];
  for (let i = 0; i < reps.length; i += 1) {
    const r = reps[i];
    let assigned = -1;
    for (const head of heads) {
      const h = reps[head];
      if (
        h.category === r.category &&
        h.ruleSignature === r.ruleSignature &&
        cosineSim(h.embedding, r.embedding) >= threshold
      ) {
        assigned = head;
        break;
      }
    }
    if (assigned >= 0) {
      canonical[i] = assigned;
    } else {
      canonical[i] = i;
      heads.push(i);
    }
  }
  return canonical;
}

export function semDedupEnabled(): boolean {
  return process.env.RISK_SEMDEDUP === "1";
}

export function semDedupThreshold(): number {
  const raw = process.env.RISK_SEMDEDUP_THRESHOLD;
  const n = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.97;
}
