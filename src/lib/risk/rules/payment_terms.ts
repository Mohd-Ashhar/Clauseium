import type { RuleFn } from "../types";

// Accepts numeric ("within 30 days"), spelled ("within ninety days") and
// parenthesised ("within ninety (90) days") day counts — all common in real
// contracts. The older numeric-only form silently failed on spelled numbers,
// which in turn suppressed the MSMED 45-day check downstream.
const HAS_DUE_DATE = /\b(?:within\s+(?:\d{1,3}|[a-z]+(?:[\s-]*\(?\d{1,3}\)?)?)\s*(?:business\s+)?(?:days?|weeks?|months?)|net\s*\d{1,3}|due\s+(?:date|on)|payable\s+within|by\s+the\s+\d{1,2}(?:st|nd|rd|th)\s+(?:day\s+of)?)/i;
const FOREIGN_CURRENCY = /\b(?:usd|us\s*dollars?|eur|euro|gbp|pounds?\s+sterling|sgd|singapore\s+dollars?|aud)\b/i;
const HAS_FEMA_REFERENCE = /\b(?:fema|foreign\s+exchange\s+management\s+act|reserve\s+bank\s+of\s+india|rbi\s+approval)\b/i;
const HAS_GST = /\b(?:gst|goods\s+and\s+services\s+tax|tds|tax\s+deduct(?:ion|ed)\s+at\s+source|withholding\s+tax)\b/i;
const HAS_LATE_FEE = /\b(?:late\s+(?:payment\s+)?(?:fee|charge|interest)|interest\s+(?:on|at)\s+\d{1,2}(?:\.\d+)?\s*%|overdue\s+(?:interest|amount)|delayed\s+payment)\b/i;
const MENTIONS_MSME_SUPPLIER = /\b(?:msme|micro,?\s*small\s+(?:and|&)\s+medium\s+enterprises?|supplier|vendor)\b/i;
const HAS_45_DAYS = /\b(?:45|forty[-\s]five)\s*days?\b/i;

export const noDueDate: RuleFn = ({ lower }) => {
  if (HAS_DUE_DATE.test(lower)) return null;
  return {
    ruleId: "pay.no_due_date",
    level: "medium",
    issue: "No payment due date specified.",
    explanation:
      "Without an express due date, payment becomes due 'within a reasonable time' which is litigation-prone. Where the supplier is an MSME, MSMED Act §15 caps the agreed payment period at 45 days from acceptance [CITE: Micro Small and Medium Enterprises Development Act 2006 | s.15 | 2006].",
    suggestion:
      "Add: 'All undisputed invoices shall be paid within thirty (30) days of receipt; in respect of any supplier registered as an MSME, payment shall be made within the period prescribed under the MSMED Act 2006.'",
    citationHints: ["Micro Small and Medium Enterprises Development Act 2006 | s.15 | 2006"],
    confidence: 0.75,
  };
};

export const msmedExceeds45Days: RuleFn = ({ lower }) => {
  if (!MENTIONS_MSME_SUPPLIER.test(lower)) return null;
  if (!HAS_DUE_DATE.test(lower)) return null;
  if (HAS_45_DAYS.test(lower)) return null;
  // Heuristic: clause specifies a period > 45 days for an MSME supplier.
  // Tolerant of spelled and parenthesised counts ("ninety (90) days",
  // "sixty days") — the older numeric-only `\b90\b\s*days` form silently
  // missed "ninety (90) days" because the "90" is followed by ")".
  const longerPeriod =
    /\b(?:60|sixty|90|ninety|120|150|180)\b[\s\S]{0,8}\bdays?\b|\bone\s+hundred(?:\s+and)?\s+(?:twenty|fifty|eighty)\b[\s\S]{0,8}\bdays?\b/i.test(
      lower,
    );
  if (!longerPeriod) return null;
  return {
    ruleId: "pay.msmed_violation",
    level: "high",
    issue: "Payment period for an MSME supplier exceeds the statutory 45-day cap.",
    explanation:
      "MSMED Act §15 prohibits the agreed payment period between an MSME supplier and a buyer from exceeding forty-five days from the day of acceptance, irrespective of contractual stipulation [CITE: Micro Small and Medium Enterprises Development Act 2006 | s.15 | 2006].",
    suggestion:
      "Reduce the payment period to a maximum of forty-five (45) days from acceptance for any MSME-registered supplier and add interest at the rate compounded monthly under MSMED Act §16 for delayed payment.",
    citationHints: ["Micro Small and Medium Enterprises Development Act 2006 | s.15 | 2006"],
    confidence: 0.8,
  };
};

export const noLateFee: RuleFn = ({ lower }) => {
  if (HAS_LATE_FEE.test(lower)) return null;
  return {
    ruleId: "pay.no_late_fee",
    level: "low",
    issue: "No interest or late fee for delayed payment.",
    explanation:
      "Indian commercial practice provides for interest on overdue payments (commonly 1.5% per month, compounded). Without it, the supplier has no contractual leverage to incentivise timely payment.",
    suggestion:
      "Add: 'Any undisputed amount not paid by its due date shall accrue interest at one and a half per cent (1.5%) per month, compounded monthly, until paid in full.'",
    citationHints: [],
    confidence: 0.6,
  };
};

export const foreignCurrencyNoFema: RuleFn = ({ lower }) => {
  if (!FOREIGN_CURRENCY.test(lower)) return null;
  if (HAS_FEMA_REFERENCE.test(lower)) return null;
  return {
    ruleId: "pay.foreign_currency_no_fema",
    level: "medium",
    issue: "Cross-border payment lacks FEMA / RBI compliance reference.",
    explanation:
      "Cross-border payments by Indian residents are regulated by the Foreign Exchange Management Act 1999 and RBI master directions. The clause should acknowledge FEMA compliance and identify the responsible party for any RBI approvals [CITE: Foreign Exchange Management Act 1999 | s.3 | 1999].",
    suggestion:
      "Add: 'All cross-border payments shall be made in compliance with the Foreign Exchange Management Act 1999 and applicable RBI master directions; the [Customer] shall obtain any approvals required for remittance.'",
    citationHints: ["Foreign Exchange Management Act 1999 | s.3 | 1999"],
    confidence: 0.75,
  };
};

export const noTaxAllocation: RuleFn = ({ lower }) => {
  if (HAS_GST.test(lower)) return null;
  return {
    ruleId: "pay.no_tax_allocation",
    level: "low",
    issue: "Allocation of GST and TDS is not addressed.",
    explanation:
      "Indian commercial contracts typically allocate GST as additional to the consideration and identify TDS obligations. Silence creates accounting and reconciliation disputes.",
    suggestion:
      "Add: 'Fees are exclusive of GST, which shall be charged additionally at the prevailing rate. The Customer shall withhold tax at source as required under the Income-tax Act 1961 and provide a TDS certificate within the statutory period.'",
    citationHints: [],
    confidence: 0.6,
  };
};

export const paymentTermsRules: RuleFn[] = [
  noDueDate,
  msmedExceeds45Days,
  noLateFee,
  foreignCurrencyNoFema,
  noTaxAllocation,
];
