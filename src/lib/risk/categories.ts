import type { ClassificationLabel } from "@/lib/classification/categories";

// Categories for which the LLM analyzer should always run, even if rules fired.
// DPDP requires LLM because the statute is moving and the rule pack only covers
// the most blatant gaps; LLM annotates nuance using RAG-grounded snippets.
export const LLM_REQUIRED_CATEGORIES: ReadonlySet<ClassificationLabel> = new Set([
  "data_protection_dpdp",
]);

// Per-category seed query used to retrieve RAG context for the LLM analyzer.
export const RAG_SEED_QUERIES: Record<ClassificationLabel, string> = {
  indemnification:
    "indemnification mutuality scope carve-outs Indian Contract Act consequential losses",
  limitation_of_liability:
    "aggregate liability cap exclusion of consequential damages Indian Contract Act section 73 74",
  termination:
    "termination for cause convenience notice period survival Indian Contract Act",
  governing_law:
    "governing law Indian Contract Act enforceability foreign law Indian commercial contract",
  jurisdiction:
    "exclusive jurisdiction Indian courts arbitration seat Arbitration and Conciliation Act 1996",
  data_protection_dpdp:
    "DPDP Act 2023 data fiduciary breach notification consent purpose limitation cross border transfer",
  payment_terms:
    "payment terms invoicing late fees MSMED Act 45 days FEMA cross-border payment",
  ip_assignment:
    "intellectual property assignment work for hire moral rights waiver Copyright Act 1957",
  other: "Indian commercial contract market practice standard",
};

export function shouldAlwaysRunLlm(category: ClassificationLabel): boolean {
  return LLM_REQUIRED_CATEGORIES.has(category);
}
