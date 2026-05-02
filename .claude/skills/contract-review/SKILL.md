---
name: contract-review-agent
description: |
  Use when building or modifying the contract review pipeline.
  Covers document parsing, clause extraction, risk analysis,
  and redline generation for Indian commercial contracts.
---

## Processing Flow
1. Upload (PDF/DOCX) → text extraction (pdf-parse / mammoth.js)
2. Structure detection → identify clauses, sections, definitions
3. Clause classification → map to 15 standard categories
4. Risk analysis → compare each clause against Indian law standards
5. Citation grounding → RAG lookup for relevant statutes/judgments
6. Redline generation → produce .docx with tracked changes
7. Executive summary → 1-page risk report with severity scores

## 15 Standard Clause Categories
governing_law, jurisdiction, arbitration, indemnification,
limitation_of_liability, termination, IP_assignment, confidentiality,
data_protection_dpdp, payment_terms, non_compete, non_solicitation,
force_majeure, representations_warranties, insurance