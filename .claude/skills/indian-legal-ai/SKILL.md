---
name: indian-legal-ai
description: |
  Indian legal AI conventions. Use when writing code that processes Indian law,
  generates legal text, handles contract analysis, or interacts with Indian
  legal databases like Indian Kanoon.
---

## Citation Format
- Supreme Court: "Party1 v. Party2, (YEAR) X SCC Y"
- High Court: "Party1 v. Party2, AIR YEAR HC PageNo"
- Store: case_name, citation, court, year, headnote, source_url

## RAG Pipeline Rules
- Chunk at section/clause level, not arbitrary token windows
- Metadata: statute_name, section, court, date, jurisdiction
- Hybrid search: pgvector cosine + PostgreSQL ts_vector BM25
- Citation verification: every citation checked against corpus
  BEFORE rendering — unverified citations get suppressed

## Contract Analysis Patterns
- Extract: parties, governing_law, jurisdiction, arbitration_clause,
  indemnity, liability_cap, termination, IP_assignment, data_protection,
  payment_terms, non_compete, force_majeure, confidentiality
- Risk levels: HIGH / MEDIUM / LOW with quantified exposure
- Always check: Indian Stamp Act, FEMA for cross-border, GST, DPDP consent