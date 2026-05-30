import type { ClassificationLabel } from "@/lib/classification/categories";
import type { ContractType } from "@/lib/risk/playbooks/types";

// Gold-standard accuracy fixtures for the DETERMINISTIC analysis layer
// (segmentation gate → rule classification → rule engine → playbook
// missing-clause check). Scoreable WITHOUT any API keys, so the eval runs in
// CI on every change and guards recall/precision against regressions.
//
// The LLM layers (per-clause Sonnet/Opus and the whole-document Opus pass) add
// recall ON TOP of this; being non-deterministic and metered they are smoke-
// tested out-of-band by scripts/eval-accuracy.ts (needs ANTHROPIC_API_KEY).

export interface GoldClause {
  // TRUE category of this clause. Used to (a) measure rule-classifier accuracy
  // and (b) drive the rule engine in isolation, so a classifier miss doesn't
  // mask a rule-engine miss.
  category: ClassificationLabel;
  text: string;
  // Rule IDs that MUST fire (recall, subset match — other rules may also fire).
  mustFire: string[];
  // When true, this clause is clean: NO high/medium finding may fire on it
  // (precision guard against false positives).
  clean?: boolean;
}

export interface GoldFixture {
  id: string;
  title: string;
  // Expected contract type from the detector (scored as type accuracy).
  contractType: ContractType;
  clauses: GoldClause[];
  // Document-level playbook expectations (only set on whole-contract fixtures).
  // Protections that SHOULD be flagged missing.
  expectedMissing?: string[];
  // Protections that ARE present and must NOT be flagged missing.
  expectedPresent?: string[];
}
