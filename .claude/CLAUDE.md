# CLAUDE.md — LegalCopilot India

## Project Overview
AI-powered contract review and drafting copilot for Indian in-house counsel.
Next.js 14 + TypeScript + Supabase + pgvector + Anthropic Claude API.

## Architecture Rules
- All API routes in /app/api/ using Next.js App Router
- Database: Supabase with Row Level Security — every query must be tenant-scoped
- AI calls: Use /lib/ai/orchestrator.ts — NEVER call Claude API directly from components
- Vector search: pgvector with hybrid BM25+semantic — see /lib/rag/search.ts
- File processing: Queue via BullMQ — contracts > 10 pages must be async

## Authentication
- Identity comes from Supabase Auth. Never import `currentUser` from mock data — use
  `getCurrentUser()` from `/lib/auth/get-current-user.ts` in server components.
- Server-side: always `supabase.auth.getUser()`, never `getSession()`. `getSession`
  reads cookies blindly; `getUser` validates against Supabase.
- All auth mutations go through server actions in `/lib/auth/actions.ts`. Do not call
  `supabase.auth.signIn*` from client components.
- Protected routes live under `/dashboard*` and are gated by both root `middleware.ts`
  and the `(app)` layout (defence in depth).
- Env vars required: see `.env.local.example`.

## Indian Legal Domain Rules (CRITICAL)
- Every AI-generated citation MUST be verified against our corpus before display
- Never use the phrase "legal advice" — always "legal information" or "legal analysis"
- All clause templates reviewed and approved by legal advisor before shipping
- DPDP Act 2023 compliance: no persistent storage of contract text beyond 30 days
  unless customer explicitly opts in via separable consent toggle
- Supported statutes: Indian Contract Act 1872, IT Act 2000, DPDP Act 2023,
  Companies Act 2013, FEMA 1999, Arbitration Act 1996, Indian Stamp Act 1899
- Zero data retention with LLM providers — use Anthropic ZDR endpoint

## Code Style
- TypeScript strict mode, no `any` types
- Tailwind CSS + Shadcn/UI components only
- tRPC for type-safe API layer
- Zod for all input validation
- Error boundaries on every page

## Testing
- Vitest for unit tests, Playwright for e2e
- Every AI pipeline must have accuracy test suite
  (50+ contract test fixtures, verified citations)

  ## Design System (CRITICAL — DO NOT IGNORE)

Clauseium follows a premium SaaS aesthetic inspired by Linear, Vercel, and Harvey AI.

### Visual Principles
- Dark → Light hybrid UI (dark hero, light content, dark footer)
- Minimal, clean, whitespace-heavy layouts
- No clutter, no excessive borders
- Every UI must feel premium and trustworthy

### Color System
- Use ONLY design tokens from globals.css
- NEVER hardcode colors
- Primary surfaces:
  - Dark: ink-950 → ink-800
  - Light: paper-50 → paper-200
- Accent (legaltech palette — restraint, NOT the AI-startup violet):
  - counsel-500 / counsel-gold (#c9a449) → primary accent + primary CTA, used SPARINGLY
  - brand-500 (violet) → DEMOTED to a faint tint only; never the dominant accent or a glow
  - Risk colors (high/med/low) are functional, not brand — leave them alone

### Typography Rules (CRITICAL — this is what makes us read as legaltech, not a dev tool)
- Headings → Display font = **editorial serif (Fraunces)** via `--font-display`. Solid color,
  near-zero tracking, lighter weights (400–600) read most premium. NO gradient-clipped text.
- Body / UI → Inter
- Clause IDs / citations / legal identifiers → JetBrains Mono ONLY (don't sprinkle mono elsewhere)

### Component Rules
- Always use Shadcn/UI as base
- Extend using Tailwind (no custom random CSS)
- Use consistent spacing (p-4, p-6, p-8)

### Layout Rules
- Max width: 1200–1280px
- Use grid-based layouts
- Bento grids for feature sections
- Sidebar: 260px expanded, 64px collapsed

## Motion & Interaction Rules

- Use Framer Motion ONLY
- Default easing: [0.16, 1, 0.3, 1]

### Standard Animations
- FadeUp: opacity 0 → 1, y 24 → 0
- Stagger children (0.08 delay)
- Scroll-based reveal (whileInView)

### Performance Rules
- Respect prefers-reduced-motion
- Avoid heavy animations inside dashboard
- Use motion only where it adds clarity


## AI UX Rules (CRITICAL)

- Always show reasoning behind outputs
- Always attach citations
- Never show raw confidence %
- Use:
  - High / Medium / Low

### Clause Analysis UI
Each clause MUST show:
- Clause ID (e.g., § 14.2)
- Risk badge (High / Medium / Low)
- Plain-English summary
- Reasoning
- Suggested redline

### Progressive Disclosure
- Default: summary
- Expand: reasoning
- Deep: full citation/source

## Frontend Architecture

### Folder Structure
- /components/ui → base components
- /components/marketing → landing page
- /components/app → dashboard + workspace
- /components/motion → animations

### Rules
- No large components (>300 lines)
- Break UI into reusable pieces
- Keep logic separate from UI

### State Management
- Server components by default
- Use client components only when needed
- Avoid unnecessary re-renders


## Page-Level Rules

### Landing Page
- Dark hero with a RESTRAINED backdrop — deep ink wash + faint grain + a single quiet gold pool.
  NO multi-color aurora, NO dot grid, NO glowing buttons (that's the dev-tool look we moved away from).
- One clear CTA
- Bento grid for features
- Logo cloud for trust
- Testimonials + compliance badges

### Dashboard
- Dark UI by default
- KPI cards at top
- Table for contracts
- Sidebar navigation

### Contract Review Page
- 3-pane layout:
  1. Document viewer
  2. Clause analysis
  3. Citations panel