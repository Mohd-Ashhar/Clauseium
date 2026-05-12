import type { ClassificationLabel } from "@/lib/classification/categories";
import type { LegalReference } from "@/lib/rag/types";
import type { RuleFinding } from "./types";
import { formatRagSnippets } from "./rag-context";

const MAX_INPUT_CHARS = 3000;
const HEAD_CHARS = 2000;
const TAIL_CHARS = 1000;

export const RISK_SYSTEM_PROMPT = `You provide legal analysis on clauses from Indian commercial contracts.
Never use the phrase "legal advice" — only "legal analysis" or "legal information".
Frame against: Indian Contract Act 1872, DPDP Act 2023, SPDI Rules 2011,
Arbitration & Conciliation Act 1996, IT Act 2000, Companies Act 2013, FEMA 1999,
Copyright Act 1957, MSMED Act 2006, Indian Stamp Act 1899.

Detect: one-sided clauses, missing protections, DPDP violations, uncapped liability,
and bad jurisdiction (foreign forum without arbitration carve-out).

Inline EVERY statutory or case reference in the explanation field using exactly
this token format: [CITE: <act-or-case-name> | <section-or-citation> | <year>]
Year omitted only for cases. Use the verified statute snippets when relevant.
You MUST include at least one [CITE: …] in the explanation when risk_level is
"high" or "medium".

Be deterministic. Prefer the shortest accurate answer. Reject speculation.

Call the submit_risk_analysis tool exactly once with your structured analysis.
Keep field lengths within the limits described in the tool schema. Even for
clauses that read as low/standard/missing, fill the issue and explanation
fields with a brief sentence — do not leave them empty.`;

export interface BuildUserPromptArgs {
  category: ClassificationLabel;
  clauseText: string;
  ruleFindings: readonly RuleFinding[];
  ragContext: readonly LegalReference[];
}

export function buildRiskUserPrompt(args: BuildUserPromptArgs): string {
  const findings =
    args.ruleFindings.length === 0
      ? "(no rule findings — analyse the clause from scratch)"
      : args.ruleFindings
          .map(
            (f) =>
              `- ${f.ruleId} (${f.level}, conf ${f.confidence.toFixed(2)}): ${f.issue}`,
          )
          .join("\n");

  const snippets = formatRagSnippets(args.ragContext);

  const truncated = truncateClause(args.clauseText);

  return `Category: ${args.category}

Rule findings (you may agree or refine; do not silently ignore high-severity findings):
${findings}

Verified statute snippets for grounding (cite when relevant):
${snippets}

Clause:
"""
${truncated}
"""

JSON:`;
}

function truncateClause(text: string): string {
  const t = (text ?? "").trim();
  if (t.length <= MAX_INPUT_CHARS) return t;
  const head = t.slice(0, HEAD_CHARS);
  const tail = t.slice(-TAIL_CHARS);
  return `${head}\n…[truncated]…\n${tail}`;
}
