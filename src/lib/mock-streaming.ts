import type { LegalCitation } from "@/types/contract";

export interface MockResponse {
  text: string;
  citations: LegalCitation[];
}

const dpdpResponse: MockResponse = {
  text: `This contract has three material gaps under the Digital Personal Data Protection Act, 2023:

1. §8.3 (Data Protection) does not specify Data Principal rights or breach notification timelines. The DPDP Rules 2025 require notification within 72 hours of discovery; this clause is silent.

2. There is no Data Processing Agreement annexed. As a Data Fiduciary, you remain responsible for the Service Provider's processing under §8(1) — a written DPA is the standard control.

3. Cross-border transfer terms are absent. Although §8.3 does not explicitly contemplate transfers, the Service Provider's parent entity is in Singapore. Under §16 you must evaluate whether the destination is a permitted jurisdiction.

Recommendation: insert a DPA as Schedule D, tighten §8.3 to specify a 24-hour internal notification window (tighter than statute), and add a sub-processor approval clause.`,
  citations: [
    {
      id: "stream_dpdp_1",
      text: "§8(1) DPDP Act",
      source: "Digital Personal Data Protection Act, 2023",
      section: "8(1)",
      status: "verified",
    },
    {
      id: "stream_dpdp_2",
      text: "§11 DPDP Act",
      source: "Digital Personal Data Protection Act, 2023",
      section: "11",
      status: "verified",
    },
  ],
};

const compareResponse: MockResponse = {
  text: `Compared to your standard MSA template (Clauseium Legal v4.2), five clauses deviate:

1. Liability cap: 3 months vs your standard 12 months — material deviation.
2. Indemnification: one-sided in counterparty's favour; your template requires mutual indemnity.
3. Governing law / seat mismatch: contract names India law but seats arbitration at SIAC; your template requires Indian seat (MCIA or DIAC).
4. Payment terms: Net-90 vs your standard Net-45 (which also aligns with the MSMED Act 45-day cap).
5. Auto-renewal: silent renewal with 90-day exit; your template requires affirmative consent to renew.

Two of your standard clauses are missing entirely: ABAC representation (Prevention of Corruption Act) and POSH compliance.

Of the five deviations, three (liability cap, indemnification, payment terms) are blocking under your playbook.`,
  citations: [
    {
      id: "stream_cmp_1",
      text: "§73 ICA",
      source: "Indian Contract Act, 1872",
      section: "73",
      status: "verified",
    },
    {
      id: "stream_cmp_2",
      text: "§15 MSMED",
      source: "MSMED Act, 2006",
      section: "15",
      status: "verified",
    },
  ],
};

const summaryResponse: MockResponse = {
  text: `Three things the business team needs to know:

• **Financial exposure is uncapped on data and IP.** The current 3-month liability cap is below market and excludes nothing — a serious data breach could cost more than you can recover.

• **The contract auto-renews silently.** If you don't give 90 days' notice before renewal, it rolls over for another year. Calendar a reminder 4 months before expiry.

• **You'll likely need partner sign-off.** Two clauses (liability cap, indemnification) deviate from playbook in ways that aren't easily fixed via redline alone — expect counterparty pushback.

Plain reading: this is a vendor-favourable contract. Negotiate before signing.`,
  citations: [],
};

const counterproposalResponse: MockResponse = {
  text: `Suggested email language for the counterparty on §14.2 (Limitation of Liability):

—

"Our internal policy requires a liability cap of 12 months of fees rather than 3, with carve-outs for IP infringement, data protection breaches under the DPDP Act, and gross negligence. This is consistent with the Indian B2B SaaS market standard and reflects our exposure under §73 of the Indian Contract Act, 1872. Please find our suggested redline below; we are happy to discuss on a call."

—

The redline itself is in the Suggested redline section of §14.2 in the analysis panel. The carve-outs (IP, DPDP, gross negligence) are your playbook's standard exclusions and are non-negotiable.`,
  citations: [
    {
      id: "stream_counter_1",
      text: "§73 ICA",
      source: "Indian Contract Act, 1872",
      section: "73",
      status: "verified",
    },
  ],
};

const fallbackResponse: MockResponse = {
  text: `I can answer questions about this contract grounded in Indian law and your playbook. Try one of the suggested prompts, or ask about a specific clause (e.g. "What's wrong with §14.2?" or "Is this DPDP compliant?").`,
  citations: [],
};

export function getMockResponse(prompt: string): MockResponse {
  const p = prompt.toLowerCase();
  if (p.includes("dpdp") || p.includes("data protection")) return dpdpResponse;
  if (p.includes("compare") || p.includes("standard msa") || p.includes("playbook")) {
    return compareResponse;
  }
  if (p.includes("summarize") || p.includes("business") || p.includes("executive")) {
    return summaryResponse;
  }
  if (
    p.includes("counter") ||
    p.includes("§14.2") ||
    p.includes("14.2") ||
    p.includes("liability")
  ) {
    return counterproposalResponse;
  }
  return fallbackResponse;
}

export const quickPrompts = [
  "Is this DPDP compliant?",
  "Compare to our standard MSA",
  "Summarize risks for the business team",
  "Draft a counterproposal for §14.2",
];
