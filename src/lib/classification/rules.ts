import type { ClassificationCategory } from "./categories";

export type RuleAnchor = "strong" | "medium" | "weak";

export interface ClauseRule {
  id: string;
  category: ClassificationCategory;
  pattern: RegExp;
  anchor: RuleAnchor;
}

export const ANCHOR_WEIGHTS: Record<RuleAnchor, number> = {
  strong: 0.9,
  medium: 0.6,
  weak: 0.4,
};

export const RULES: readonly ClauseRule[] = [
  // ─── indemnification ─────────────────────────────────────────────────
  {
    id: "indemn.indemnify_hold_harmless",
    category: "indemnification",
    pattern: /\bindemnif(?:y|ies|ied|ication)\b[\s\S]{0,80}\b(?:hold\s+harmless|defend)\b/i,
    anchor: "strong",
  },
  {
    id: "indemn.hold_harmless_from",
    category: "indemnification",
    pattern: /\bhold\s+harmless\b[\s\S]{0,60}\b(?:from|against)\b/i,
    anchor: "strong",
  },
  {
    id: "indemn.indemnify_against",
    category: "indemnification",
    pattern: /\bindemnif(?:y|ies|ied)\b[\s\S]{0,80}\b(?:against|from)\b/i,
    anchor: "strong",
  },
  {
    id: "indemn.indemnitee",
    category: "indemnification",
    pattern: /\bindemnitee[s]?\b/i,
    anchor: "medium",
  },
  {
    id: "indemn.section_73_ica",
    category: "indemnification",
    pattern: /\bSection\s*73\b[\s\S]{0,40}\b(?:Indian\s+Contract\s+Act|ICA)\b/i,
    anchor: "medium",
  },

  // ─── limitation_of_liability ─────────────────────────────────────────
  {
    id: "lol.in_no_event_exceed",
    category: "limitation_of_liability",
    pattern: /\b(?:in\s+no\s+event|aggregate\s+liability)\b[\s\S]{0,100}\b(?:exceed|cap(?:ped)?|limited\s+to)\b/i,
    anchor: "strong",
  },
  {
    id: "lol.consequential_damages",
    category: "limitation_of_liability",
    pattern: /\b(?:consequential|indirect|incidental|punitive|exemplary)\s+damages\b/i,
    anchor: "strong",
  },
  {
    id: "lol.liability_shall_not_exceed",
    category: "limitation_of_liability",
    pattern: /\bliability\b[\s\S]{0,80}\b(?:shall|will)\s+(?:not\s+)?exceed\b/i,
    anchor: "strong",
  },
  {
    id: "lol.cap_on_liability",
    category: "limitation_of_liability",
    pattern: /\bcap\s+on\s+liability\b/i,
    anchor: "medium",
  },

  // ─── termination ─────────────────────────────────────────────────────
  {
    id: "term.terminate_for_cause_or_convenience",
    category: "termination",
    pattern: /\btermin(?:ate|ation)\b[\s\S]{0,80}\b(?:for\s+(?:cause|convenience)|written\s+notice\s+of\s+\d+)/i,
    anchor: "strong",
  },
  {
    id: "term.material_breach_cure",
    category: "termination",
    pattern: /\b(?:material\s+breach|cure\s+period)\b/i,
    anchor: "medium",
  },
  {
    id: "term.survive_termination",
    category: "termination",
    pattern: /\bsurviv(?:e|al)\s+(?:the\s+)?(?:termination|expiry|expiration)\b/i,
    anchor: "medium",
  },
  {
    id: "term.notice_to_terminate",
    category: "termination",
    pattern: /\bnotice\s+(?:in\s+writing\s+)?to\s+terminate\b/i,
    anchor: "strong",
  },

  // ─── governing_law ───────────────────────────────────────────────────
  {
    id: "gov.governed_by_laws_of_india",
    category: "governing_law",
    pattern: /\bgovern(?:ed|ing)\s+by\s+(?:and\s+construed\s+(?:in\s+accordance\s+with\s+)?)?the\s+laws?\s+of\s+(?:the\s+Republic\s+of\s+)?India\b/i,
    anchor: "strong",
  },
  {
    id: "gov.indian_contract_act_1872",
    category: "governing_law",
    pattern: /\bIndian\s+Contract\s+Act,?\s*1872\b/i,
    anchor: "strong",
  },
  {
    id: "gov.substantive_laws_of_india",
    category: "governing_law",
    pattern: /\bsubstantive\s+laws?\s+of\s+India\b/i,
    anchor: "strong",
  },
  {
    id: "gov.construed_accordance_indian",
    category: "governing_law",
    pattern: /\bconstrued\s+in\s+accordance\s+with\s+(?:the\s+)?(?:laws|laws?\s+of\s+India)/i,
    anchor: "medium",
  },

  // ─── jurisdiction ────────────────────────────────────────────────────
  {
    id: "jur.exclusive_jurisdiction_indian_city",
    category: "jurisdiction",
    pattern: /\b(?:exclusive\s+)?jurisdiction\s+of\s+(?:the\s+)?courts?\s+(?:at|in|of)\s+(?:Mumbai|Bombay|Delhi|New\s+Delhi|Bengaluru|Bangalore|Chennai|Kolkata|Calcutta|Hyderabad|Pune|Ahmedabad|Gurgaon|Gurugram|Noida)\b/i,
    anchor: "strong",
  },
  {
    id: "jur.named_high_court",
    category: "jurisdiction",
    pattern: /\b(?:Bombay|Delhi|Madras|Calcutta|Karnataka|Allahabad|Punjab\s+and\s+Haryana|Gujarat|Kerala|Telangana)\s+High\s+Court\b/i,
    anchor: "strong",
  },
  {
    id: "jur.courts_shall_have_jurisdiction",
    category: "jurisdiction",
    pattern: /\bcourts?\s+(?:at|in)\s+\S+[\s\S]{0,30}(?:shall\s+have\s+)?(?:exclusive\s+)?jurisdiction\b/i,
    anchor: "strong",
  },
  {
    id: "jur.subject_to_jurisdiction",
    category: "jurisdiction",
    pattern: /\bsubject\s+to\s+the\s+(?:exclusive\s+)?jurisdiction\s+of\b/i,
    anchor: "medium",
  },

  // ─── data_protection_dpdp ────────────────────────────────────────────
  {
    id: "dpdp.full_act_name",
    category: "data_protection_dpdp",
    pattern: /\bDigital\s+Personal\s+Data\s+Protection\s+Act,?\s*2023\b/i,
    anchor: "strong",
  },
  {
    id: "dpdp.dpdp_acronym",
    category: "data_protection_dpdp",
    pattern: /\bDPDP(?:\s+Act)?(?:\s*,?\s*2023)?\b/i,
    anchor: "strong",
  },
  {
    id: "dpdp.fiduciary_principal",
    category: "data_protection_dpdp",
    pattern: /\b(?:data\s+fiduciary|data\s+principal|significant\s+data\s+fiduciary)\b/i,
    anchor: "strong",
  },
  {
    id: "dpdp.spdi_rules",
    category: "data_protection_dpdp",
    pattern: /\bSPDI\s+Rules?(?:,?\s*2011)?\b/i,
    anchor: "medium",
  },
  {
    id: "dpdp.personal_data_consent",
    category: "data_protection_dpdp",
    pattern: /\bpersonal\s+data\b[\s\S]{0,80}\b(?:consent|processing|fiduciary)\b/i,
    anchor: "medium",
  },

  // ─── payment_terms ───────────────────────────────────────────────────
  {
    id: "pay.net_terms",
    category: "payment_terms",
    pattern: /(?:\bnet\s*\d{1,3}\b|\bwithin\s+(?:\d{1,3}|\w+\s*\(\d{1,3}\))\s+(?:business\s+)?days\b)/i,
    anchor: "strong",
  },
  {
    id: "pay.payment_invoice",
    category: "payment_terms",
    pattern: /\b(?:invoice|payment)\b[\s\S]{0,80}\b(?:due|payable|days|net\s*\d{1,3})\b/i,
    anchor: "medium",
  },
  {
    id: "pay.gst_tds",
    category: "payment_terms",
    pattern: /\b(?:GST|goods\s+and\s+services\s+tax|TDS|tax\s+deducted\s+at\s+source)\b/i,
    anchor: "medium",
  },
  {
    id: "pay.late_payment",
    category: "payment_terms",
    pattern: /\blate\s+payment\b[\s\S]{0,40}\b(?:fee|interest|charge|rate)s?\b/i,
    anchor: "strong",
  },
  {
    id: "pay.invoice_due",
    category: "payment_terms",
    pattern: /\binvoice\b[\s\S]{0,40}\b(?:due|payable)\b/i,
    anchor: "medium",
  },

  // ─── ip_assignment ───────────────────────────────────────────────────
  {
    id: "ip.assigns_ip",
    category: "ip_assignment",
    pattern: /\b(?:hereby\s+)?assigns?\b[\s\S]{0,80}\b(?:intellectual\s+property|IP\s+rights?|copyrights?|patents?|trademarks?)\b/i,
    anchor: "strong",
  },
  {
    id: "ip.work_for_hire",
    category: "ip_assignment",
    pattern: /\bwork\s+(?:made\s+)?for\s+hire\b/i,
    anchor: "strong",
  },
  {
    id: "ip.moral_rights_waiver",
    category: "ip_assignment",
    pattern: /\b(?:moral\s+rights?\b[\s\S]{0,40}\bwaiv|waiv\w*\b[\s\S]{0,40}\bmoral\s+rights?)/i,
    anchor: "medium",
  },
  {
    id: "ip.all_right_title_interest",
    category: "ip_assignment",
    pattern: /\ball\s+right,?\s+title\s+(?:and|&)\s+interest\b[\s\S]{0,80}\b(?:intellectual\s+property|inventions|works)\b/i,
    anchor: "strong",
  },
];

const _byCategory = new Map<ClassificationCategory, ClauseRule[]>();
for (const rule of RULES) {
  const list = _byCategory.get(rule.category);
  if (list) list.push(rule);
  else _byCategory.set(rule.category, [rule]);
}
export const RULES_BY_CATEGORY: ReadonlyMap<
  ClassificationCategory,
  readonly ClauseRule[]
> = _byCategory;
