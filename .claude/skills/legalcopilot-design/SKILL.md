---
name: legalcopilot-design
description: |
  Design system for LegalCopilot. Use when building any UI component.
---

## Brand Identity
- Colors: Navy (#1B2B4B), Emerald (#059669) success/verified,
  Amber (#D97706) warnings, Red (#DC2626) high risk
- Typography: Inter (UI), Merriweather (legal text — serif = authority)
- Border radius: 8px, shadows: subtle (sm, md only)

## Core UX Principle: "Show Your Work"
Every AI output must show:
1. The original clause (highlighted)
2. The suggested rewrite (diff view)
3. Legal basis (verified citations with clickable links)
4. Confidence score (percentage)
5. One-click actions: Accept / Dismiss / Edit / Ask AI

## Trust Signals (Non-Negotiable)
- ✅ badge on every verified citation (links to Indian Kanoon)
- Confidence score on every analysis
- "Reviewed by [Name], Advocate" on all templates
- Audit trail visible to user
- Processing status animation: "Parsing... Analyzing... Verifying..."
  (users trust AI more when they see it working)

## The "6-Minute Review" Flow
Upload → Live progress → Risk dashboard → Clause cards → Export DOCX
Every step must feel instant. Use optimistic UI + streaming.