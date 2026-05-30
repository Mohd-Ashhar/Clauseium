import type { ContractType } from "./types";

// Lightweight, deterministic contract-type detection from title + body text.
// This is a heuristic prior only — the whole-document LLM analyzer is also told
// the detected type and may reason beyond it. We keep it rule-based so it is
// fast, free, and predictable. Order matters: more specific types win.

interface TypeSignal {
  type: ContractType;
  // Strong title cues (weighted heavily) and body cues (weighted lightly).
  title: RegExp[];
  body: RegExp[];
}

const SIGNALS: TypeSignal[] = [
  {
    type: "nda",
    title: [/\bnda\b/, /non-?disclosure/, /confidentialit(?:y|ies) agreement/],
    body: [/mutual non-?disclosure/, /receiving party.*disclosing party/],
  },
  {
    type: "sow",
    title: [/statement of work/, /\bsow\b/, /work order/],
    body: [/deliverables?.*milestones?/, /scope of work/],
  },
  {
    type: "saas",
    title: [/saas/, /subscription agreement/, /software as a service/, /cloud services? agreement/],
    body: [/subscription (?:term|fee)/, /service level/, /uptime/, /software as a service/],
  },
  {
    type: "employment",
    title: [/employment agreement/, /offer letter/, /appointment letter/, /contract of employment/],
    body: [/\bemployee\b.*\bemployer\b/, /salary|ctc|compensation package/, /probation period/],
  },
  {
    type: "lease",
    title: [/lease/, /leave and licen[cs]e/, /rental agreement/, /tenancy/],
    body: [/lessor.*lessee/, /licensor.*licensee/, /demised premises/, /monthly rent/],
  },
  {
    type: "consulting",
    title: [/consult(?:ing|ant) agreement/, /advisory agreement/, /retainer/],
    body: [/consultant shall provide/, /advisory services/],
  },
  {
    type: "vendor",
    title: [/vendor agreement/, /supply agreement/, /purchase agreement/, /procurement/, /reseller/],
    body: [/supplier shall (?:supply|deliver)/, /purchase order/, /goods and services/],
  },
  {
    type: "msa",
    title: [/master services? agreement/, /\bmsa\b/, /services? agreement/, /master agreement/],
    body: [/master services? agreement/, /service provider shall/, /the services/],
  },
];

export interface DetectedType {
  type: ContractType;
  confidence: number; // 0..1
  matchedOn: string;
}

export function detectContractType(
  title: string,
  bodyText: string,
): DetectedType {
  const t = (title ?? "").toLowerCase();
  // Only the head of the body is needed for type cues, and it keeps this cheap.
  const b = (bodyText ?? "").slice(0, 8000).toLowerCase();

  let best: DetectedType = { type: "generic", confidence: 0.3, matchedOn: "default" };

  for (const sig of SIGNALS) {
    const titleHit = sig.title.find((re) => re.test(t));
    if (titleHit) {
      // Title match is a strong signal — return immediately (signals are
      // ordered specific→general, so the first title hit is the best one).
      return { type: sig.type, confidence: 0.9, matchedOn: `title:${titleHit.source}` };
    }
    const bodyHit = sig.body.find((re) => re.test(b));
    if (bodyHit && best.confidence < 0.6) {
      best = { type: sig.type, confidence: 0.6, matchedOn: `body:${bodyHit.source}` };
    }
  }

  return best;
}
