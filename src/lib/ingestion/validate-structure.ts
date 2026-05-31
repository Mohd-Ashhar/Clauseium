import type { StructuredDocument } from "@/types/ingestion";
import { topLevelNumbers } from "./structure";

// Lightweight, pure structural validation. It does NOT judge legal quality —
// only whether the numbered clause skeleton looks coherent. An invalid result
// routes the document to the LLM segmentation-repair fallback in the
// orchestrator. Intentionally lenient so well-formed NDAs (few clauses) and
// schedule-restart numbering pass without invoking the LLM.

export type StructureProblem =
  | "duplicate_numbers"
  | "non_monotonic"
  | "count_deviation"
  | "too_few";

export interface StructureValidation {
  valid: boolean;
  topLevelCount: number; // numbered top-level clauses in the parsed doc
  estimatedCount: number; // independent estimate from the raw text
  problems: StructureProblem[];
  duplicateNumbers: number[];
}

export function validateStructure(
  doc: StructuredDocument,
  normalizedText: string,
): StructureValidation {
  const numbered = topLevelNumbers(doc).filter((n): n is number => n !== null);
  const topLevelCount = numbered.length;
  const estimatedCount = estimateTopLevel(normalizedText);

  const problems: StructureProblem[] = [];

  // Split into runs on a STRICT descent (n < prev) — a legitimate
  // schedule/annexure renumber restart. An equal value (n === prev) stays in the
  // run so a true duplicate is caught; >3 runs signals genuinely scrambled
  // numbering rather than a couple of schedule restarts.
  const runs: number[][] = [];
  let run: number[] = [];
  let prev = 0;
  for (const n of numbered) {
    if (n < prev) {
      if (run.length) runs.push(run);
      run = [n];
    } else {
      run.push(n);
    }
    prev = n;
  }
  if (run.length) runs.push(run);

  const duplicateNumbers: number[] = [];
  for (const r of runs) {
    const seen = new Set<number>();
    for (const n of r) {
      if (seen.has(n)) duplicateNumbers.push(n);
      seen.add(n);
    }
  }
  if (duplicateNumbers.length > 0) problems.push("duplicate_numbers");
  if (runs.length > 3) problems.push("non_monotonic");

  if (topLevelCount < 2 && estimatedCount >= 5) {
    problems.push("too_few");
  } else if (
    estimatedCount >= 5 &&
    Math.abs(topLevelCount - estimatedCount) > Math.max(5, 0.25 * estimatedCount)
  ) {
    problems.push("count_deviation");
  }

  return {
    valid: problems.length === 0,
    topLevelCount,
    estimatedCount,
    problems,
    duplicateNumbers: [...new Set(duplicateNumbers)],
  };
}

// Independent estimate of the top-level clause count, read straight from the
// normalized source text (not the parsed structure). We find the largest K such
// that every integer 1..K appears as a numbered line — robust against stray
// fragments and immune to whatever the parser did, so a collapsed parse
// (few clauses) is caught by comparing against this.
export function estimateTopLevel(normalizedText: string): number {
  const seen = new Set<number>();
  for (const line of normalizedText.split("\n")) {
    const m = /^\s*(\d{1,3})[.)]\s+\S/.exec(line);
    if (m) seen.add(Number.parseInt(m[1], 10));
  }
  let k = 0;
  while (seen.has(k + 1)) k += 1;
  return k;
}
