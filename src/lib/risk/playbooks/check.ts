import type { RiskLevel } from "@/types/contract";
import { playbookFor } from "./definitions";
import type { ContractType } from "./types";

export interface MissingClauseFinding {
  key: string;
  label: string;
  importance: "required" | "recommended";
  riskLevel: RiskLevel;
  whyItMatters: string;
}

export interface PlaybookCheckResult {
  type: ContractType;
  typeLabel: string;
  present: string[]; // keys present
  missing: MissingClauseFinding[]; // expected-but-absent protections
}

// Deterministic "missing protection" detector. Runs each expected clause's
// match patterns against the full document text; anything not found becomes a
// missing-clause finding. This is the rule-grounded half of competitive
// "missing clause" detection — the whole-document LLM pass complements it with
// nuance (one-sided present clauses, cross-clause conflicts).
export function checkPlaybook(
  type: ContractType,
  documentText: string,
): PlaybookCheckResult {
  const book = playbookFor(type);
  const haystack = (documentText ?? "").toLowerCase();

  const present: string[] = [];
  const missing: MissingClauseFinding[] = [];

  for (const expected of book.expected) {
    const found = expected.match.some((re) => re.test(haystack));
    if (found) {
      present.push(expected.key);
    } else {
      missing.push({
        key: expected.key,
        label: expected.label,
        importance: expected.importance,
        riskLevel: expected.missingRisk,
        whyItMatters: expected.whyItMatters,
      });
    }
  }

  return { type: book.type, typeLabel: book.label, present, missing };
}
