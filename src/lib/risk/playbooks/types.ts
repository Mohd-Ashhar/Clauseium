import type { RiskLevel } from "@/types/contract";

// Contract archetypes we recognise. Kept deliberately small and India-centric;
// "generic" is the safe default playbook applied when the type is unclear.
export const CONTRACT_TYPES = [
  "msa",
  "nda",
  "sow",
  "saas",
  "employment",
  "vendor",
  "consulting",
  "lease",
  "generic",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

// A clause the playbook expects a healthy contract of this type to contain.
// `match` is a permissive regex over the full document text used to decide
// whether the protection is PRESENT. Absence of an `importance: required`
// expectation is itself a finding ("missing protection").
export interface ExpectedClause {
  key: string;
  label: string;
  importance: "required" | "recommended";
  // If ANY pattern matches the (lowercased) document text, the protection is
  // considered present. Patterns should be broad enough to catch common
  // phrasings but specific enough to avoid false positives.
  match: RegExp[];
  // Risk level to assign when this expected clause is ABSENT.
  missingRisk: RiskLevel;
  // Short reviewer-facing note explaining why the absence matters.
  whyItMatters: string;
}

export interface Playbook {
  type: ContractType;
  label: string;
  expected: ExpectedClause[];
}
