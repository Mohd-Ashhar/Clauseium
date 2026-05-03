import type { LegalCitation } from "@/types/contract";
import type { VerificationResult } from "./types";

export const DROP_BELOW = 0.3;
export const FLAG_BELOW = 0.7;

export interface GateOutput {
  citations: LegalCitation[];
  trustScore: number;
  counts: {
    extracted: number;
    verified: number;
    partial: number;
    dropped: number;
  };
}

export function applyQualityGate(results: VerificationResult[]): GateOutput {
  if (results.length === 0) {
    return {
      citations: [],
      trustScore: 1,
      counts: { extracted: 0, verified: 0, partial: 0, dropped: 0 },
    };
  }

  let verified = 0;
  let partial = 0;
  let dropped = 0;
  let confidenceSum = 0;
  const citations: LegalCitation[] = [];

  for (const r of results) {
    const drop = r.status === "unverified" || r.confidence < DROP_BELOW;
    if (drop) {
      dropped += 1;
      continue;
    }

    const flag =
      r.status === "partially_verified" || r.confidence < FLAG_BELOW;

    confidenceSum += r.confidence;
    if (r.status === "verified" && !flag) verified += 1;
    else partial += 1;

    citations.push(toLegalCitation(r, flag));
  }

  const trustScore = Math.round((confidenceSum / results.length) * 1000) / 1000;

  return {
    citations,
    trustScore,
    counts: {
      extracted: results.length,
      verified,
      partial,
      dropped,
    },
  };
}

function toLegalCitation(
  r: VerificationResult,
  flag: boolean,
): LegalCitation {
  const out: LegalCitation = {
    id: r.citation.id,
    text: r.citation.raw,
    source: r.citation.caseOrStatute,
    section: r.citation.sectionOrCitation,
    status: r.status,
    url: r.sourceUrl,
  };
  if (flag) {
    out.warning = buildWarning(r);
  }
  return out;
}

function buildWarning(r: VerificationResult): string {
  const reasons: string[] = [];
  if (r.status === "partially_verified") reasons.push("partial source agreement");
  if (!r.kanoon.checked) reasons.push("external source unavailable");
  else if (!r.kanoon.confirmed) reasons.push("not found in Indian Kanoon");
  if (!r.local.confirmed) reasons.push("not found in local corpus");
  if (r.local.confirmed && r.local.relevance < 0.55) {
    reasons.push(`low relevance ${r.local.relevance.toFixed(2)}`);
  }
  return reasons.length > 0
    ? `Review: ${reasons.join("; ")}`
    : `Confidence ${r.confidence.toFixed(2)}`;
}
