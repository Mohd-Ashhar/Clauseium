// Hard-coded source text for citations referenced in mock-data.ts.
// Keyed by `${source-shorthand}-${section}`.
// In production, these would be fetched from Indian Kanoon / India Code.

export interface CitationSource {
  title: string;
  body: string;
  reference: string;
  source: string;
  url?: string;
}

const sources: Record<string, CitationSource> = {
  "ica-73": {
    title: "Compensation for loss or damage caused by breach of contract",
    reference: "Section 73, Indian Contract Act, 1872",
    source: "Indian Contract Act, 1872",
    url: "https://indiankanoon.org/doc/1745449/",
    body:
      "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.\n\nSuch compensation is not to be given for any remote and indirect loss or damage sustained by reason of the breach. Compensation for failure to discharge an obligation resembling those created by contract — When an obligation resembling those created by contract has been incurred and has not been discharged, any person injured by the failure to discharge it is entitled to receive the same compensation from the party in default, as if such person had contracted to discharge it and had broken his contract.",
  },
  "ica-74": {
    title: "Compensation for breach of contract where penalty stipulated for",
    reference: "Section 74, Indian Contract Act, 1872",
    source: "Indian Contract Act, 1872",
    url: "https://indiankanoon.org/doc/691237/",
    body:
      "When a contract has been broken, if a sum is named in the contract as the amount to be paid in case of such breach, or if the contract contains any other stipulation by way of penalty, the party complaining of the breach is entitled, whether or not actual damage or loss is proved to have been caused thereby, to receive from the party who has broken the contract reasonable compensation not exceeding the amount so named or, as the case may be, the penalty stipulated for.\n\nExplanation — A stipulation for increased interest from the date of default may be a stipulation by way of penalty.",
  },
  "ica-27": {
    title: "Agreement in restraint of trade, void",
    reference: "Section 27, Indian Contract Act, 1872",
    source: "Indian Contract Act, 1872",
    url: "https://indiankanoon.org/doc/1244073/",
    body:
      "Every agreement by which any one is restrained from exercising a lawful profession, trade or business of any kind, is to that extent void.\n\nException 1 — Saving of agreement not to carry on business of which goodwill is sold: One who sells the goodwill of a business may agree with the buyer to refrain from carrying on a similar business, within specified local limits, so long as the buyer, or any person deriving title to the goodwill from him, carries on a like business therein, provided that such limits appear to the Court reasonable, regard being had to the nature of the business.",
  },
  "ica-56": {
    title: "Agreement to do impossible act",
    reference: "Section 56, Indian Contract Act, 1872",
    source: "Indian Contract Act, 1872",
    url: "https://indiankanoon.org/doc/848468/",
    body:
      "An agreement to do an act impossible in itself is void.\n\nA contract to do an act which, after the contract is made, becomes impossible, or, by reason of some event which the promisor could not prevent, unlawful, becomes void when the act becomes impossible or unlawful.",
  },
  "dpdp-8(1)": {
    title: "General obligations of Data Fiduciary",
    reference: "Section 8(1), Digital Personal Data Protection Act, 2023",
    source: "Digital Personal Data Protection Act, 2023",
    url: "https://www.indiacode.nic.in/handle/123456789/2023-DPDP",
    body:
      "A Data Fiduciary shall, irrespective of any agreement to the contrary or failure of a Data Principal to carry out the duties provided under this Act, be responsible for complying with the provisions of this Act and the rules made thereunder in respect of any processing undertaken by it or on its behalf by a Data Processor.\n\nA Data Fiduciary shall make reasonable efforts to ensure the accuracy and completeness of personal data, where such data is likely to be used to make a decision that affects the Data Principal, or where such data is likely to be disclosed to another Data Fiduciary.",
  },
  "dpdp-11": {
    title: "Right to access information about personal data",
    reference: "Section 11, Digital Personal Data Protection Act, 2023",
    source: "Digital Personal Data Protection Act, 2023",
    url: "https://www.indiacode.nic.in/handle/123456789/2023-DPDP",
    body:
      "A Data Principal shall have the right to obtain from the Data Fiduciary to whom she has previously given consent for the processing of personal data: a summary of personal data which is being processed by such Data Fiduciary; the identities of all other Data Fiduciaries and Data Processors with whom the personal data has been shared; and any other information related to the personal data of such Data Principal as may be prescribed.",
  },
  "dpdp-13": {
    title: "Right to grievance redressal",
    reference: "Section 13, Digital Personal Data Protection Act, 2023",
    source: "Digital Personal Data Protection Act, 2023",
    url: "https://www.indiacode.nic.in/handle/123456789/2023-DPDP",
    body:
      "A Data Principal shall have the right of readily available means of grievance redressal provided by a Data Fiduciary or Consent Manager. The Data Fiduciary or Consent Manager shall respond to grievances within such period as may be prescribed.\n\nThe Data Principal shall exhaust the opportunity of redressing her grievance under this section before approaching the Board.",
  },
  "arb-9": {
    title: "Interim measures by the Court",
    reference: "Section 9, Arbitration and Conciliation Act, 1996",
    source: "Arbitration and Conciliation Act, 1996",
    url: "https://indiankanoon.org/doc/195577/",
    body:
      "A party may, before or during arbitral proceedings or at any time after the making of the arbitral award but before it is enforced in accordance with section 36, apply to a court for: an interim measure of protection in respect of preservation, interim custody or sale of any goods which are the subject-matter of the arbitration agreement; securing the amount in dispute in the arbitration; the detention, preservation or inspection of any property or thing which is the subject-matter of the dispute; interim injunction or the appointment of a receiver.",
  },
  "arb-20": {
    title: "Place of arbitration",
    reference: "Section 20, Arbitration and Conciliation Act, 1996",
    source: "Arbitration and Conciliation Act, 1996",
    url: "https://indiankanoon.org/doc/1306164/",
    body:
      "The parties are free to agree on the place of arbitration. Failing any agreement referred to in sub-section (1), the place of arbitration shall be determined by the arbitral tribunal having regard to the circumstances of the case, including the convenience of the parties.",
  },
  "msmed-15": {
    title: "Liability of buyer to make payment",
    reference: "Section 15, Micro, Small and Medium Enterprises Development Act, 2006",
    source: "MSMED Act, 2006",
    url: "https://indiankanoon.org/doc/1543037/",
    body:
      "Where any supplier supplies any goods or renders any services to any buyer, the buyer shall make payment therefor on or before the date agreed upon between him and the supplier in writing or, where there is no agreement in this behalf, before the appointed day; provided that in no case the period agreed upon between the supplier and the buyer in writing shall exceed forty-five days from the day of acceptance or the day of deemed acceptance.",
  },
  "copyright-17": {
    title: "First owner of copyright",
    reference: "Section 17, Copyright Act, 1957",
    source: "Copyright Act, 1957",
    url: "https://indiankanoon.org/doc/116170617/",
    body:
      "Subject to the provisions of this Act, the author of a work shall be the first owner of the copyright therein, provided that in the case of a literary, dramatic or artistic work made by the author in the course of his employment by the proprietor of any newspaper, magazine or similar periodical under a contract of service or apprenticeship, for the purpose of publication in a newspaper, magazine or similar periodical, the said proprietor shall, in the absence of any agreement to the contrary, be the first owner of the copyright in the work in so far as the copyright relates to the publication of the work in any newspaper, magazine or similar periodical.",
  },
  "consumer-2(46)": {
    title: "Unfair contract",
    reference: "Section 2(46), Consumer Protection Act, 2019",
    source: "Consumer Protection Act, 2019",
    url: "https://indiankanoon.org/doc/87385692/",
    body:
      "\"Unfair contract\" means a contract between a manufacturer or trader or service provider on one hand, and a consumer on the other, having such terms which cause significant change in the rights of such consumer including: requiring manifestly excessive security deposits; imposing any penalty on the consumer for breach of contract thereof which is wholly disproportionate to the loss; refusing to accept early repayment of debts; permitting unilateral termination without reasonable cause.",
  },
  "posh-4": {
    title: "Constitution of Internal Committee",
    reference: "Section 4, Sexual Harassment of Women at Workplace Act, 2013",
    source: "POSH Act, 2013",
    url: "https://indiankanoon.org/doc/96354572/",
    body:
      "Every employer of a workplace shall, by an order in writing, constitute a Committee to be known as the \"Internal Committee\". Provided that where the offices or administrative units of the workplace are located at different places or divisional or sub-divisional level, the Internal Committee shall be constituted at all administrative units or offices.",
  },
  "poca": {
    title: "Prevention of Corruption Act, 1988",
    reference: "Prevention of Corruption Act, 1988",
    source: "Prevention of Corruption Act, 1988",
    url: "https://indiankanoon.org/doc/1474035/",
    body:
      "An Act to consolidate and amend the law relating to the prevention of corruption and for matters connected therewith. The 2018 amendment introduced offences relating to bribery of public servants by commercial organisations and prescribed corporate liability where any person associated with a commercial organisation gives or promises to give any undue advantage to a public servant.",
  },
};

// Heuristic mapper: match a citation to a source key based on its source + section.
export function getCitationSource(args: { source: string; section: string }): CitationSource | null {
  const src = args.source.toLowerCase();
  const sec = args.section.toLowerCase();
  if (src.includes("indian contract")) {
    if (sec.startsWith("73")) return sources["ica-73"];
    if (sec.startsWith("74")) return sources["ica-74"];
    if (sec.startsWith("27")) return sources["ica-27"];
    if (sec.startsWith("56")) return sources["ica-56"];
  }
  if (src.includes("digital personal data") || src.includes("dpdp")) {
    if (sec.startsWith("8")) return sources["dpdp-8(1)"];
    if (sec.startsWith("11")) return sources["dpdp-11"];
    if (sec.startsWith("13")) return sources["dpdp-13"];
  }
  if (src.includes("arbitration")) {
    if (sec.startsWith("9")) return sources["arb-9"];
    if (sec.startsWith("20")) return sources["arb-20"];
  }
  if (src.includes("msme")) return sources["msmed-15"];
  if (src.includes("copyright")) return sources["copyright-17"];
  if (src.includes("consumer protection")) return sources["consumer-2(46)"];
  if (src.includes("posh") || src.includes("sexual harassment")) return sources["posh-4"];
  if (src.includes("prevention of corruption")) return sources["poca"];
  return null;
}
