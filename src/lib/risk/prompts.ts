import type { ClassificationLabel } from "@/lib/classification/categories";
import type { LegalReference } from "@/lib/rag/types";
import type { RuleFinding } from "./types";
import { formatRagSnippets } from "./rag-context";

// Clauses are sent to the analyzer in full up to this ceiling. The previous
// 3,000-char limit silently truncated the middle of long, dense provisions
// (exactly the ones most likely to hide risk), so the model graded half a
// clause. Sonnet/Opus context is ample; only pathologically large blobs are
// head+tail trimmed.
const MAX_INPUT_CHARS = 16000;
const HEAD_CHARS = 11000;
const TAIL_CHARS = 4000;

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

RISK LEVEL — grade the ACTUAL terms of the clause, not its topic. Being a
liability, indemnity, IP or jurisdiction clause is NOT itself a reason to flag
risk; a well-drafted clause in a high-stakes category is "standard".
- high     — a material, one-sided exposure or a clear statutory breach to fix
             now: uncapped or nominal liability, a one-way indemnity, an
             exclusive FOREIGN forum with no Indian-seat arbitration, an unwaived
             DPDP breach-notification gap, an MSMED payment-term violation.
- medium   — a real but bounded deviation worth a redline: a protection that is
             PRESENT but weaker than market standard (a cap with no fraud /
             wilful-misconduct carve-out; an indemnity with no super-cap), or a
             partially-mitigated one-sided tilt.
- low      — a minor or stylistic gap; the clause is broadly acceptable and
             could merely be tightened.
- standard — the clause is balanced, mutual or adequately protective and
             consistent with Indian market norms. Use this freely, INCLUDING in
             high-stakes categories. The following are "standard", NOT medium:
               · a mutual indemnity that is capped or subject to the liability cap
               · a liability cap that carves out fraud / gross negligence /
                 wilful misconduct and excludes indirect & consequential damages
               · exclusive jurisdiction of an Indian court (e.g. courts at Mumbai)
               · a full IP assignment with work-for-hire and a moral-rights waiver
- missing  — a standard protection the contract should contain is absent.

Be precise and grounded. Reject speculation. Do NOT under-report a genuine risk
to be safe — if a clause is one-sided, uncapped, or missing a standard
protection, say so plainly and grade it accordingly. But equally, do NOT inflate
a sound, market-standard clause to "medium" merely because its category is
high-stakes or because an even stronger version is imaginable: if the terms are
balanced and protective, grade them standard/low.

Call the submit_risk_analysis tool exactly once with your structured analysis.
Write a thorough, reviewer-grade analysis:
  - issue: a sharp one-line problem statement
  - explanation: the legal reasoning AND the commercial exposure, grounded in
    the relevant statute (with [CITE: …] tokens for high/medium)
  - suggestion: concrete redline / replacement language the reviewer can use
Even for clauses that read as low/standard/missing, fill issue and explanation
with a substantive sentence — never leave them empty.`;

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
