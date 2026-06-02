"use client";

import { FadeUp } from "@/components/motion/fade-up";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const items = [
  {
    q: "Is my contract data used to train AI models?",
    a: "Never. Clauseium operates under zero data retention agreements with all foundation model providers. Your contracts are processed in-memory, citations are verified, and no data is stored beyond your encrypted workspace. We use AWS Mumbai for data residency under the DPDP Act.",
  },
  {
    q: "How is Clauseium different from ChatGPT or Harvey?",
    a: "ChatGPT has no Indian law training and hallucinates citations in 30%+ of legal queries. Harvey is built for AmLaw 100 firms at $1,200+ per seat. Clauseium is purpose-built for Indian in-house counsel — grounded in the Indian Contract Act, DPDP Act, Companies Act, and FEMA, with a three-stage citation verification pipeline that blocks unverified references before you see them. At 1/10th of Harvey's price.",
  },
  {
    q: "Does it actually know Indian law?",
    a: "Yes. Our RAG system is grounded in Indian Kanoon (16M+ judgments), India Code (all Central Acts), DPDP Act 2023 + Rules 2025, RBI Master Directions, and SEBI Regulations. Every citation is verified against the source before display. Our legal advisory board includes practising advocates enrolled with the Bar Council of India.",
  },
  {
    q: "How does it integrate with Word?",
    a: "Clauseium installs as a Microsoft Word Add-in. Open any contract in Word, click 'Review with Clauseium' in the sidebar, and receive clause-by-clause analysis, risk flags, and suggested redlines — all without leaving your document.",
  },
  {
    q: "What about DPDP Act compliance?",
    a: "Clauseium automatically scans every contract for DPDP compliance gaps — checking for consent mechanisms, data processing agreements, breach notification terms, cross-border transfer clauses, and Data Principal rights provisions as required under the DPDP Rules 2025.",
  },
  {
    q: "Can I bring my own contracting playbook?",
    a: "Absolutely. Upload your firm's standard positions, preferred clause language, and risk thresholds. Clauseium learns your playbook and enforces it during every review — flagging deviations from your standards, not just generic best practices.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-paper-50 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <FadeUp>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-counsel-600">
            FAQ
          </p>
          <h2 className="mt-3 text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            Frequently asked questions
          </h2>
        </FadeUp>

        <FadeUp delay={0.1} className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {items.map((it, i) => (
              <AccordionItem key={it.q} value={`item-${i}`}>
                <AccordionTrigger>{it.q}</AccordionTrigger>
                <AccordionContent>{it.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeUp>
      </div>
    </section>
  );
}
