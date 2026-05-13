# Clauseium MVP — Feature & Architecture Reference

This document is the canonical reference for everything shipped in the Clauseium
MVP. **An LLM picking up this codebase should read this file before editing.** It
captures architecture, conventions, hidden constraints, and the precise location
of every load-bearing piece.

> Companion file: [MVP_TEST_PLAN.txt](MVP_TEST_PLAN.txt) is the manual test
> checklist that walks through every feature documented here.

---

## 1 · What Clauseium is

AI-powered contract review and drafting copilot for **Indian in-house counsel**.
The MVP delivers two surfaces against the same backend:

- **Web app** (Next.js 16, hosted on `clauseium.com` in prod, `localhost:3000` in
  dev) — upload .docx/.pdf, see clause-by-clause analysis with risk badges,
  suggested redlines, verified citations against Indian statutes/case law.
- **Word add-in** (Yeoman-less webpack, hosted on `addin.clauseium.app` in prod,
  `localhost:3001` in dev) — same analysis surfaced inside Microsoft Word's task
  pane via Office Add-ins / Office.js. **The MVP add-in's promise:** "Never
  leave Word."

Both surfaces talk to the same Supabase project and the same Anthropic LLM
backend.

---

## 2 · Architecture overview

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│   Word (Desktop / Online)    │       │   Next.js app                │
│   ┌────────────────────────┐ │       │   localhost:3000             │
│   │  Task Pane (iframe)    │ │       │                              │
│   │  React 19              │ │ HTTPS │   /api/contracts/upload      │
│   │  Tailwind 4            │ │ Bearer│   /api/contracts/[id]/status │
│   │  ───────────────       │ │       │   /api/analysis/[id]         │
│   │  Auth dialog           │◄┼───────┼─► /api/contracts/by-hash/... │
│   │  Clause cards          │ │       │   /api/contracts/[id]/chat   │
│   │  Tracked redlines      │ │       │   /api/contracts/[id]/       │
│   │  Ask AI chat           │ │       │     clause-actions           │
│   │  ───────────────       │ │       │   /api/contracts/[id]/       │
│   └────────────────────────┘ │       │     analyze-risk             │
│   ┌────────────────────────┐ │       │   /api/admin/reanalyze-      │
│   │  Word document body    │◄┼ Word.js │   unparseable              │
│   │  (user's contract)     │ │       │   /addin-auth + callback     │
│   └────────────────────────┘ │       │                              │
└──────────────────────────────┘       └──────────────────────────────┘
                                                       │
                                                       ▼
                                       Supabase project (Postgres + Auth
                                       + RLS + Storage), Anthropic API
                                       (Claude Haiku 4.5), OpenAI (embeds
                                       only — RAG corpus), Indian Kanoon
                                       (citation verification, optional)
```

**Tenancy model.** Every Supabase row that mentions `owner_user_id` is RLS-scoped.
The same RLS policies apply to both web cookie sessions and add-in Bearer JWTs —
identity flows through `getAuthedContext(req)` regardless of source.

---

## 3 · Monorepo layout

```
/Clauseium
├── src/                            Next.js 16 web app (app router)
│   ├── app/                        Routes
│   │   ├── (app)/                  Authenticated dashboard pages
│   │   ├── (auth)/                 Login / signup / OAuth callback
│   │   ├── (marketing)/            Landing pages
│   │   ├── addin-auth/             OAuth bridge for the Word add-in
│   │   │   ├── page.tsx            Sign-in (Google + Microsoft)
│   │   │   ├── actions.ts          signInWithOAuthForAddin(provider)
│   │   │   └── callback/route.ts   Posts tokens via Office.messageParent
│   │   └── api/                    REST endpoints (see § 4)
│   ├── components/                 Web app UI (NOT shared with add-in)
│   ├── lib/                        Backend logic
│   │   ├── auth/                   getAuthedContext, mapSupabaseUser
│   │   ├── supabase/               server (cookies), bearer (token), service-role
│   │   ├── risk/                   Analyzer: orchestrator, llm-analyzer, prompts, rules
│   │   ├── ingestion/              Parse + persist + substantive-check
│   │   ├── classification/         Clause category classifier
│   │   ├── rag/                    Legal corpus search (BM25 + embeddings)
│   │   ├── citations/              Indian Kanoon verification, persist
│   │   └── ai/                     Chat SSE (sse.ts, chat.ts, chat.schemas.ts)
│   └── types/                      Shared TS types
├── word-addin/                     Word task-pane app (npm workspace)
│   ├── manifests/
│   │   ├── manifest.template.xml   Source of truth (committed)
│   │   └── manifest.{dev,staging,prod}.xml  Generated, git-ignored
│   ├── scripts/
│   │   ├── generate-icons.mjs      Builds 5 placeholder PNGs
│   │   └── build-manifest.mjs      Templates env-specific manifests
│   ├── src/
│   │   ├── api/                    Fetch wrappers for backend
│   │   ├── office/                 Office.js / Word.js bridge
│   │   ├── state/                  React state + persistence
│   │   ├── taskpane/               UI (routes + components)
│   │   ├── lib/                    cn, constants
│   │   ├── styles/                 tokens.css, tailwind
│   │   └── types/                  Mirror of /src/types/contract.ts shapes
│   ├── assets/                     Icon PNGs (committable; replace freely)
│   ├── webpack.config.js
│   ├── package.json
│   └── TEST_CHECKLIST.md           Word-side manual checklist (Chunk A/B era)
├── supabase/migrations/            0001 → 0008 (apply via SQL editor or CLI)
├── scripts/                        Tooling (ingest legal corpus, debug analyzer)
├── tests/                          Vitest integration tests
└── middleware.ts                   Next.js middleware (auth + CORS)
```

The web app and add-in are intentionally NOT type-sharing through a workspace
package. Add-in components copy the shapes from `src/types/contract.ts` into
`word-addin/src/types/contract.ts` to avoid pulling Next.js + `server-only`
modules into the webpack bundle.

---

## 4 · Backend (Next.js app)

### 4.1 Auth (Bearer + cookies)

Every `/api/*` route uses **[`getAuthedContext(req)`](src/lib/auth/get-authed-context.ts)**,
which prefers `Authorization: Bearer <jwt>` and falls back to Supabase
cookies. Both paths return `{ user, supabase }` where the supabase client is
RLS-bound to the same identity that auth saw.

- **Bearer Supabase client** ([src/lib/supabase/bearer.ts](src/lib/supabase/bearer.ts)) —
  `@supabase/supabase-js` with `auth.persistSession: false` and
  `global.headers.Authorization = "Bearer <token>"`. Does NOT write cookies.
- **Cookie Supabase client** ([src/lib/supabase/server.ts](src/lib/supabase/server.ts)) —
  `@supabase/ssr` with cookie read/write through `next/headers`.
- **Service-role client** ([src/lib/supabase/service-role.ts](src/lib/supabase/service-role.ts)) —
  bypasses RLS, only for internal workers / admin endpoints.

**Why this matters:** Earlier versions called `createClient()` after Bearer auth
validated, producing an unauthenticated PostgREST connection — RLS silently
returned empty results. `getAuthedContext` is the single source of truth.

### 4.2 CORS middleware

[middleware.ts](middleware.ts) reads `ADDIN_ORIGIN` (comma-separated allow-list).
For `/api/*` requests with a matching `Origin` header, short-circuits OPTIONS
preflights with 204 + ACAO/ACAM/ACAH headers. Bearer-only — does NOT set
`Access-Control-Allow-Credentials` (cookies are deliberately excluded from
cross-origin paths). [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts)
also short-circuits cookie refresh when the request carries `Authorization`.

### 4.3 OAuth bridge for the add-in

The Office Dialog API can't carry cookies, so signing into the add-in needs a
client-initiated OAuth flow that ends with a `messageParent` callback.

- [src/app/addin-auth/page.tsx](src/app/addin-auth/page.tsx) — minimal sign-in
  with Google + Microsoft buttons. No marketing chrome.
- [src/app/addin-auth/sign-in-buttons.tsx](src/app/addin-auth/sign-in-buttons.tsx) —
  client component, per-provider loading state.
- [src/app/addin-auth/actions.ts](src/app/addin-auth/actions.ts) —
  `signInWithOAuthForAddin(provider)` → Supabase `signInWithOAuth({ provider,
  options: { redirectTo: '/addin-auth/callback' } })`.
- [src/app/addin-auth/callback/route.ts](src/app/addin-auth/callback/route.ts) —
  exchanges OAuth code via `exchangeCodeForSession`, then returns a self-
  contained HTML page that loads `office.js` from the Microsoft CDN and calls
  `Office.context.ui.messageParent(JSON.stringify(tokens))`. The JSON payload
  is escaped (`<` → `<`) to prevent script-tag breakout via token chars.

### 4.4 By-hash short-circuit

[src/app/api/contracts/by-hash/[sha256]/route.ts](src/app/api/contracts/by-hash/[sha256]/route.ts) —
GET with a 64-char lowercase hex SHA-256 path param. RLS-scoped to caller; if
the user has previously uploaded a .docx with this exact content hash, returns
its `{ contractId, status, title, processed_at, uploaded_at }`. Lets the add-in
re-opening a known document skip the entire upload + analyze round-trip.

Hash is computed at upload time in
[src/app/api/contracts/upload/route.ts](src/app/api/contracts/upload/route.ts)
via `createHash('sha256').update(fileBuffer).digest('hex')`.

### 4.5 Risk analyzer

The analyzer takes the parsed clauses for a contract and emits per-clause
`{ riskLevel, issue, explanation, suggestion, confidence, method, ruleIds }`.

**Architecture** (read-order):

1. **Rules** ([src/lib/risk/rules/](src/lib/risk/rules/)) — synchronous,
   category-specific (`limitation_of_liability`, `data_protection_dpdp`,
   `jurisdiction`, …). Cheap; run first.
2. **Orchestrator** ([src/lib/risk/orchestrator.ts](src/lib/risk/orchestrator.ts)) —
   for each clause:
   - If `clause_text` < 40 chars OR fails `isSubstantiveClause` → return
     synthetic standard finding without LLM call. Non-substantive rows are
     tagged `ruleIds: ["NON_SUBSTANTIVE"]`.
   - Else run rules. If rules don't fire (or category is `data_protection_dpdp`,
     always-LLM), escalate to the Anthropic call.
   - Bound by `maxLlmCalls` (default 100, env `RISK_MAX_LLM_CALLS`).
3. **LLM analyzer** ([src/lib/risk/llm-analyzer.ts](src/lib/risk/llm-analyzer.ts)) —
   model: `claude-haiku-4-5-20251001`. Forced tool use (`tool_choice: { type:
   "tool", name: "submit_risk_analysis" }`) — Anthropic guarantees the response
   is a `tool_use` block whose `input` matches the declared `input_schema`. No
   JSON parsing required.
   - Wrapped in `p-retry` (2 retries, 500–3000ms backoff) for transient errors.
   - Parse errors are re-thrown via `AbortError` so p-retry doesn't waste API
     calls on un-fixable problems.
   - On total failure (rate limit exhausted, credits depleted, etc.), returns
     the **soft fallback**: `{ risk_level: "standard", issue: "Manual review
     recommended", explanation: "Automated analysis was inconclusive…",
     confidence: 0.3, failedToParse: true }`. The orchestrator stamps
     `LLM_PARSE_FAILED` onto `ruleIds` so the admin re-analyze endpoint can
     find these rows later.
4. **Merge** — `mergeRuleAndLlm()` picks the higher severity between rule and
   LLM, attaches citation hints, backfills `[CITE: …]` tokens if the LLM
   omitted them for high/medium-risk findings.
5. **Persist** ([src/lib/risk/persist.ts](src/lib/risk/persist.ts)) — writes
   to `clauses.risk_*` columns via service-role client.

**Why tool use over free-form JSON:** earlier versions parsed text JSON from
Claude's output. ~80% of clauses on real Indian MSAs failed schema validation
because (a) max_tokens=600 truncated mid-string, (b) the Zod schema's
`.max(600)` was tighter than the model's natural verbosity. Tool use forces
the model to populate a typed schema directly; the JSON parsing path is gone.

**Why `LLM_PARSE_FAILED` instead of a new column:** extending
`clauses.risk_method` would have required migration 0009. Using the existing
`risk_rule_ids` array column is migration-free and lets the admin endpoint
filter via `risk_rule_ids @> array['LLM_PARSE_FAILED']`.

**Bug fixes shipped during MVP testing:**
- `max_tokens` 600 → 1500 (avoid mid-JSON truncation).
- Zod `max(600)` on `explanation` removed (was rejecting useful 700–1500 char
  output).
- PostgREST `ilike` wildcards (`%…%` → `*…*`) — was matching zero rows.
- Admin endpoint concurrency 4 → 2 (Anthropic 50K-tokens/min cap on Haiku).
- Verbose Zod error logging (specific field + reason, not just "schema fail").
- `useClauseActions` stale-closure deps.

### 4.6 Non-substantive content filter

[src/lib/ingestion/substantive-check.ts](src/lib/ingestion/substantive-check.ts) —
`isSubstantiveClause(text)` returns false for:

- Template comments (`^** ` prefix)
- Page markers (`^PAGE \d+ of \d+$`)
- Attachment / exhibit / schedule / annex markers
- Bare title strings (`MASTER SERVICE AGREEMENT$`)
- Table of contents lines
- Signature block intros (`IN WITNESS WHEREOF…`)
- Fragments < 80 chars or < 8 words
- Strings that are > 70% uppercase letters

Filtered clauses still land in the DB (so the document viewer keeps every
paragraph). They just don't reach the LLM, and the analysis route emits
`risk: null` for them so the UI doesn't surface a meaningless "Standard"
callout. Tested by [substantive-check.test.ts](src/lib/ingestion/substantive-check.test.ts).

### 4.7 Admin reanalyze endpoint

[src/app/api/admin/reanalyze-unparseable/route.ts](src/app/api/admin/reanalyze-unparseable/route.ts) —
POST, gated by `INTERNAL_PROCESSING_SECRET` header (timing-safe compare via
`src/lib/ingestion/internal-auth.ts`). Service-role Supabase client (bypasses
RLS).

Filter: `risk_issue ILIKE '*unparseable response*' OR risk_rule_ids @>
ARRAY['LLM_PARSE_FAILED']` (PostgREST uses `*` wildcards, **not** SQL `%`).
Groups affected clauses by `contract_id`, re-runs each contract's
`analyzeClauseRisks(..., { concurrency: 2 })`, persists, returns
`{ runId, scanned, retried, succeeded, still_failing, contracts_touched }`.

Idempotent. Re-run as many times as needed to drain stragglers — anything
that succeeds drops out of the filter.

### 4.8 Analysis route

[src/app/api/analysis/[id]/route.ts](src/app/api/analysis/[id]/route.ts) — GET
returns the entire bundle the UI needs: contract status + summary buckets +
clause array.

Key per-clause field: `search_anchor` (≤150 chars, normalized fingerprint —
strip soft hyphens, fold curly quotes to ASCII, collapse whitespace) is
exposed in the response so the add-in can find clauses in the live Word doc.
Server-side, it's computed once at ingestion ([src/lib/ingestion/search-anchor.ts](src/lib/ingestion/search-anchor.ts))
and stored on `clauses.search_anchor`. Backfill of pre-existing rows lives
in migration 0008.

When a clause's `risk_rule_ids` contains `NON_SUBSTANTIVE`, the route emits
`risk: null` so the UI hides the risk callout entirely.

### 4.9 Database schema

8 migrations under [supabase/migrations/](supabase/migrations/).

| Migration | Purpose |
|---|---|
| 0001 | Core: `contracts`, `clauses`, RLS policies, storage bucket |
| 0002 | `clause_classifications` table (category classifier) |
| 0003 | `legal_documents`, `legal_chunks` (RAG corpus) |
| 0004 | Citation columns on clauses |
| 0005 | Risk columns on clauses (`risk_level`, `risk_issue`, etc.) |
| 0006 | `clause_actions` (per-user accept/modify/reject decisions) |
| 0007 | `leads` (marketing) |
| 0008 | `contracts.content_sha256` + partial index, `clauses.search_anchor` + backfill |

**Important constraints:**
- `clauses.risk_method` check constraint: `('rule', 'llm', 'rule_llm_agree')`.
  Adding new values needs a migration. We sidestep this by using
  `risk_rule_ids` markers (`NON_SUBSTANTIVE`, `LLM_PARSE_FAILED`) instead.
- DPDP-compliance: per [.claude/CLAUDE.md](.claude/CLAUDE.md) contract text
  is retained ≤ 30 days unless the user opts in via separable consent toggle.
  (The toggle UI is not yet implemented; default behavior is 30-day retention.)

---

## 5 · Word add-in (/word-addin)

### 5.1 Build pipeline

Hand-rolled (no `yo office`) so we only pull what we need.

- **Webpack** ([word-addin/webpack.config.js](word-addin/webpack.config.js)):
  - Entry: `taskpane.tsx` → `taskpane.html`
  - Dev: HTTPS on `:3001` using `office-addin-dev-certs`
  - Loaders: ts-loader, postcss-loader (Tailwind 4), css-loader, style-loader
  - Plugins: HtmlWebpackPlugin, CopyWebpackPlugin (manifest + assets),
    **DefinePlugin** (injects `process.env.{APP_ORIGIN, ADDIN_ORIGIN,
    SUPABASE_URL, SUPABASE_ANON_KEY}` at build time)
  - `historyApiFallback` so `https://localhost:3001/` serves `taskpane.html`
- **TypeScript** ([word-addin/tsconfig.json](word-addin/tsconfig.json)) —
  strict mode, `noUncheckedIndexedAccess`, `paths: { "@addin/*": [src/*] }`.
- **Tailwind 4** ([word-addin/src/styles/tokens.css](word-addin/src/styles/tokens.css)) —
  design tokens (ink-*, brand-*, counsel-*, risk-*) copied from the main app's
  `globals.css`. Body locked to dark.
- **Dotenv** — webpack config loads `../.env.local` so the workspace shares
  the main app's Supabase env. Aliases `NEXT_PUBLIC_SUPABASE_URL` →
  `SUPABASE_URL` for the add-in's import path.

**Manifest** is generated from a template, not hand-edited:

- [word-addin/manifests/manifest.template.xml](word-addin/manifests/manifest.template.xml) —
  source of truth with `{{MANIFEST_GUID}}`, `{{DISPLAY_NAME}}`,
  `{{ADDIN_ORIGIN}}`, `{{APP_ORIGIN}}` placeholders.
- [word-addin/scripts/build-manifest.mjs](word-addin/scripts/build-manifest.mjs) —
  `--env=dev|staging|prod`. Three distinct GUIDs so all three can coexist in
  one Word install. Staging/prod read origins from `ADDIN_ORIGIN_STAGING` etc.
- `prestart` / `predev` / `prebuild` npm hooks auto-regenerate the right
  manifest before sideload / dev server / production build.

**Icons** are placeholder PNGs:

- [word-addin/scripts/generate-icons.mjs](word-addin/scripts/generate-icons.mjs) —
  no-dep generator using Node `zlib` + inline CRC32. Brand-purple background
  with a hand-bitmapped "§" mark at 16/32/64/80/128 px.
- Idempotent: skips files that already exist. Real artwork dropped into
  `word-addin/assets/` is never overwritten.

### 5.2 Office bridge

The single point where everything Office.js / Word.js touches lives.

- [word-addin/src/office/ready.ts](word-addin/src/office/ready.ts) —
  `officeReady()` returns `{ host, platform, isOfficeHost }`. **1500 ms
  timeout** so non-Office contexts (Safari, Pages) don't hang forever.
- [word-addin/src/office/auth-dialog.ts](word-addin/src/office/auth-dialog.ts) —
  `openAuthDialog(provider)` opens `Office.context.ui.displayDialogAsync` at
  `${APP_ORIGIN}/addin-auth?provider=...`. Listens for
  `DialogMessageReceived` (payload) and `DialogEventReceived` (user closed →
  code 12006 → `cancelled`). Returns `{ access_token, refresh_token,
  expires_at, token_type }`.
- [word-addin/src/office/document-reader.ts](word-addin/src/office/document-reader.ts) —
  `readOpenDocument()` streams the .docx via
  `Office.context.document.getFileAsync(Compressed)` in 4 MB slices,
  concatenates, computes SHA-256 via Web Crypto. Always `file.closeAsync()`
  in `finally`. Caps at 25 MB (matches `uploadFormSchema`).
- [word-addin/src/office/search.ts](word-addin/src/office/search.ts) —
  `findClauseRange(ctx, clause)` runs `body.search(search_anchor, {
  matchCase: false })`. For multi-match collisions, loads body.paragraphs +
  match.paragraphs.getFirst() and picks the match whose paragraph index is
  closest to `clause.position`.
- [word-addin/src/office/document-writer.ts](word-addin/src/office/document-writer.ts) —
  `scrollToClause(clause)` uses `range.select("Start")` (Word.js has no
  `scrollIntoView` on Range). `applyRedline(clause, suggestion, {
  trackChangesAccepted })` ensures `changeTrackingMode = trackAll` then
  calls `range.insertText(suggestion, Word.InsertLocation.replace)` which
  produces a single tracked-change revision pair. Falls back to clipboard
  via `navigator.clipboard.writeText` when consent is `clipboard_only`.
- [word-addin/src/office/diagnostics.ts](word-addin/src/office/diagnostics.ts) —
  `getHostDiagnostics()` reads `Office.context.diagnostics` for the
  non-Office-host explainer.

### 5.3 Auth state

Tokens are stored in **`localStorage`** (machine-local) — **never in
`Office.context.roamingSettings`** (Microsoft-roamed across the user's M365
tenant; would put tokens on Microsoft's infra, breaks DPDP posture).

- [word-addin/src/state/persistence.ts](word-addin/src/state/persistence.ts) —
  `loadTokens()`, `saveTokens()`, `clearTokens()`, `isAccessTokenExpiring()`.
- [word-addin/src/state/auth-context.tsx](word-addin/src/state/auth-context.tsx) —
  React Context with `signIn(provider)`, `signOut()`, `getAccessToken()`.
  The last preemptively refreshes if `expires_at - now <= 60s`.
- [word-addin/src/api/client.ts](word-addin/src/api/client.ts) — exposes
  `refreshAccessToken(refreshToken)` (hits Supabase REST `/auth/v1/token`
  directly to avoid pulling the heavy `@supabase/supabase-js` SDK into the
  add-in bundle).

### 5.4 Document flow (Chunk A)

[word-addin/src/state/contract-store.ts](word-addin/src/state/contract-store.ts)
is the state machine. States:

```
idle → reading → checking_hash → consent_needed → uploading → queued
                                                ↓
                                  (existing? skip to:)
                                                ↓
                                          fetching_analysis → ready

idle → reading → ... → error (anywhere)
```

Auto-runs on Workspace mount. Behaviors:
- `reading` — calls `readOpenDocument()`.
- `checking_hash` — calls `lookupByHash(sha256)`. On 200 → skip to
  `fetching_analysis` or polling; on 404 → `consent_needed` (first time)
  or `uploading`.
- `consent_needed` — overlay [ConsentDialog](word-addin/src/taskpane/components/ConsentDialog.tsx)
  with the DPDP 30-day notice. Decision persisted in
  `localStorage["clauseium.addin.consent.v1"]`.
- `uploading` — `uploadContract({ blob, filename })`.
- `queued`/`processing` — `pollUntilReady(contractId, getAccessToken)`. 2s
  for the first 30s, then 5s. Hard cap at 5 min.
- `fetching_analysis` — `getAnalysis(contractId)`.
- `ready` — UI renders.
- `error` — typed code (`document_unsaved`, `too_large`, `consent_declined`,
  `processing_failed`, `unauthorized`, generic). UI offers Retry when
  recoverable.

Abort/cancel is wired through an `AbortController` ref so unmount or contract
switch cleanly cancels any in-flight call.

### 5.5 Clause workspace (Chunk B)

[word-addin/src/taskpane/routes/Workspace.tsx](word-addin/src/taskpane/routes/Workspace.tsx).
After analysis lands:

- Clicking a clause card → `scrollToClause(clause)` (fire-and-forget).
- **Accept redline** → checks
  `localStorage["clauseium.addin.track-changes-consent.v1"]`. On first click,
  shows [TrackChangesPrompt](word-addin/src/taskpane/components/TrackChangesPrompt.tsx)
  with three options:
  - **Apply as tracked change** → consent saved as `accepted` →
    `applyRedline(clause, suggestion, { trackChangesAccepted: true })` →
    `clauseActions.setAction(clause.id, "accepted")` → toast.
  - **Copy to clipboard instead** → consent saved as `clipboard_only` →
    `applyRedline` falls back to `navigator.clipboard.writeText` → still
    persists `accepted` server-side.
  - **Cancel** → no consent saved, no action taken.
- **Reject** → `clauseActions.setAction(clause.id, "rejected")`.
- On `applyRedline` returning `not_found` → toast "Couldn't locate this
  clause in the document" + no mutation, no persist.

Decision hydration ([word-addin/src/state/use-clause-actions.ts](word-addin/src/state/use-clause-actions.ts))
fetches existing decisions via `GET /api/contracts/:id/clause-actions` on
mount so re-opening a previously-reviewed contract shows accepted/rejected
state. Mutations are optimistic with revert-on-failure.

### 5.6 Ask AI chat drawer (Chunk C)

[word-addin/src/taskpane/components/ChatDrawer.tsx](word-addin/src/taskpane/components/ChatDrawer.tsx) —
collapsible bottom drawer. **36 px collapsed**, **320 px expanded**. Internal
`useReducer` with actions `RESET / BEGIN_SEND / REFS / DELTA / DONE /
STREAM_ERROR / INPUT_CHANGE / TOGGLE_EXPANDED`.

Wire-up in Workspace:
- Clicking **Ask AI** on a clause card sets `chatHint = { clauseId,
  defaultPrompt }`. ChatDrawer's `useEffect` on `clauseHint` expands the
  drawer, auto-sends the prompt with the `clause_id`, then calls
  `onConsumeHint()` so the parent clears the hint.
- ContractId change → `RESET` (chat is memory-only; no cross-contract
  history).

SSE consumer: [word-addin/src/api/chat.ts](word-addin/src/api/chat.ts):
- `streamChat({ contractId, messages, clauseId, accessToken, signal,
  onEvent })`.
- Uses `apiFetchRaw` (the no-throw variant of `apiFetch`) so 401/409/429/503
  preserve their status codes for fine-grained UI mapping.
- Reads `response.body.getReader()` + `TextDecoder`, buffers, splits on
  `\n\n`, parses each frame's `event:` + `data:` lines, dispatches typed
  events: `refs | delta | done | error`.
- **Must NOT use EventSource** — it can't carry the `Authorization` header.

Rendering:
- [ChatMessage](word-addin/src/taskpane/components/ChatMessage.tsx) —
  user/assistant bubble. `renderWithRefs(text, refs)` walks the streamed
  text once, swapping `[REF_N]` tokens for inline `<RefChip variant="inline">`.
  Unknown refs (model hallucinated) render as literal `[REF_N]` text — never
  crash.
- [RefChip](word-addin/src/taskpane/components/RefChip.tsx) — inline pill or
  block chip. Block mode shows source-type icon (Book for statute, Scale for
  case) + citation text + external-link arrow when `url` present.
- [ChatEmptyState](word-addin/src/taskpane/components/ChatEmptyState.tsx) —
  three suggested questions when the drawer's empty.

Error mapping in the drawer:
- 401 → "Sign in again to continue." (badge per-message + chrome banner)
- 409 → "Analysis still in progress — try again in a moment."
- 429 → "Only 2 chats can run at once." (Anthropic rate limit, 2 concurrent
  streams per user enforced server-side)
- 503 → "AI chat is temporarily unavailable."
- Other → "Stream interrupted. Try again."

### 5.7 Polish (Chunk D)

- [LoadingSkeleton](word-addin/src/taskpane/components/LoadingSkeleton.tsx) —
  Clauseium § mark + 3 staggered-pulse bars while `officeReady()` resolves.
  Respects `prefers-reduced-motion`.
- [ErrorBoundary](word-addin/src/taskpane/routes/Error.tsx) — class component
  catching render-time crashes. Fallback UI offers **Reload** (preserves
  sign-in via localStorage) and **Sign out** (clears all three
  `clauseium.addin.*` localStorage keys + reload). Logs `[addin] crash
  <name>: <message>` for Office DevTools spotting.
- [NotInWordExplainer](word-addin/src/taskpane/components/NotInWordExplainer.tsx) —
  shown when `officeReady()` reports `isOfficeHost: false`. Open `https://localhost:3001/taskpane.html`
  directly in Safari → after 1.5s timeout, this renders instead of the
  sign-in screen. Detected host string is shown for support diagnostics.

### 5.8 UI component inventory

| Component | File | Purpose |
|---|---|---|
| `RiskBadge` | [components/RiskBadge.tsx](word-addin/src/taskpane/components/RiskBadge.tsx) | High/Medium/Low/Standard/Missing pill |
| `ConfidenceBars` | [components/ConfidenceBars.tsx](word-addin/src/taskpane/components/ConfidenceBars.tsx) | 8 segmented bars + % |
| `CitationPill` | [components/CitationPill.tsx](word-addin/src/taskpane/components/CitationPill.tsx) | Inline citation chip (verified/partial/unverified) |
| `ClauseCard` | [components/ClauseCard.tsx](word-addin/src/taskpane/components/ClauseCard.tsx) | Expandable clause UI |
| `SummaryHeader` | [components/SummaryHeader.tsx](word-addin/src/taskpane/components/SummaryHeader.tsx) | Title + risk counts + sign-out |
| `FilterTabs` | [components/FilterTabs.tsx](word-addin/src/taskpane/components/FilterTabs.tsx) | All/High/Med/OK/Missing |
| `UploadProgress` | [components/UploadProgress.tsx](word-addin/src/taskpane/components/UploadProgress.tsx) | State-machine progress card + typed error view |
| `ConsentDialog` | [components/ConsentDialog.tsx](word-addin/src/taskpane/components/ConsentDialog.tsx) | DPDP 30-day notice overlay |
| `TrackChangesPrompt` | [components/TrackChangesPrompt.tsx](word-addin/src/taskpane/components/TrackChangesPrompt.tsx) | One-time consent (apply / clipboard / cancel) |
| `EmptyState` | [components/EmptyState.tsx](word-addin/src/taskpane/components/EmptyState.tsx) | Generic empty state |
| `LegalFooter` | [components/LegalFooter.tsx](word-addin/src/taskpane/components/LegalFooter.tsx) | "Legal information, not legal advice" footer |
| `ChatDrawer` | [components/ChatDrawer.tsx](word-addin/src/taskpane/components/ChatDrawer.tsx) | SSE-streamed chat |
| `ChatMessage` | [components/ChatMessage.tsx](word-addin/src/taskpane/components/ChatMessage.tsx) | Single chat bubble |
| `RefChip` | [components/RefChip.tsx](word-addin/src/taskpane/components/RefChip.tsx) | Inline / block citation chip |
| `ChatEmptyState` | [components/ChatEmptyState.tsx](word-addin/src/taskpane/components/ChatEmptyState.tsx) | Three suggested questions |
| `LoadingSkeleton` | [components/LoadingSkeleton.tsx](word-addin/src/taskpane/components/LoadingSkeleton.tsx) | Branded boot skeleton |
| `NotInWordExplainer` | [components/NotInWordExplainer.tsx](word-addin/src/taskpane/components/NotInWordExplainer.tsx) | Open-in-Word explainer |

Routes:
- [routes/SignedOut.tsx](word-addin/src/taskpane/routes/SignedOut.tsx) — sign-in
- [routes/Workspace.tsx](word-addin/src/taskpane/routes/Workspace.tsx) — main
- [routes/Error.tsx](word-addin/src/taskpane/routes/Error.tsx) — `ErrorBoundary`

---

## 6 · Conventions (non-negotiable)

1. **Tokens in `localStorage`, never `Office.context.roamingSettings`** — DPDP
   posture; we don't want tokens roaming through Microsoft's infra.
2. **"Legal information, not legal advice"** — never the phrase "legal
   advice" anywhere in user-visible text. The footer
   ([LegalFooter](word-addin/src/taskpane/components/LegalFooter.tsx)) is
   always visible.
3. **DPDP 30-day retention** disclosed on the ConsentDialog. The user must
   accept before the first upload.
4. **All `/api/*` calls carry `Authorization: Bearer <jwt>`** via `apiFetch`
   or `apiFetchRaw`. No cookies cross-origin.
5. **Chat over `fetch` + `ReadableStream`, never `EventSource`** —
   EventSource can't carry the Authorization header.
6. **Add-in components are copied, not shared** from the web app via
   tsconfig paths — `server-only` + Next.js modules + React-version
   mismatches make sharing unsafe. Update both copies when conventions
   change.
7. **Clause anchoring uses `search_anchor`** (≤150 chars normalized
   fingerprint), not raw `clause_text`. Word's `body.search` caps at 255
   chars; we stay well under.
8. **Apply Redline must produce tracked changes**, never direct mutations.
   `Word.ChangeTrackingMode.trackAll` + `range.insertText(suggestion,
   Word.InsertLocation.replace)`.
9. **Risk analyzer uses Anthropic tool use**, NOT free-form JSON.
   `tool_choice: { type: "tool", name: "submit_risk_analysis" }`.
10. **Non-substantive content** (template comments, page markers, bare
    headings) does NOT reach the LLM. Filtered at orchestrator entry by
    `isSubstantiveClause`.
11. **The user-facing fallback message** when analysis truly fails reads
    "Manual review recommended" — never reveals internal validation
    semantics ("schema mismatch", "parse error", etc.).
12. **PostgREST `ilike` wildcards are `*`, not `%`** — easy to miss when
    porting SQL-style filters into `.or()` / `.filter()` calls.

---

## 7 · Hidden gotchas (read before editing)

- **XML comments disallow `--`** anywhere except the closing `-->`. Manifest
  comments referencing `npm run start --workspace` will break the XML
  parser. Use `-w` short form or describe at a higher level.
- **`Word.Range` has no `scrollIntoView`** despite the DOM Range having one.
  Use `range.select("Start")` or `range.select("End")`.
- **Office.js `onReady` may never fire outside Office** (Safari, Pages).
  `officeReady()` has a 1500 ms timeout fallback. If you remove it, the
  loading skeleton hangs forever in non-Office contexts.
- **`tool_choice: { type: "tool", name: "X" }`** with `max_tokens` too low
  causes Anthropic to return a partial `tool_use` block whose `input` is a
  truncated/invalid JSON object. Keep `max_tokens >= 1500` for our schema.
- **Anthropic Haiku 4.5 rate limit: 50,000 input tokens/min per org.** Bulk
  reanalysis at concurrency 4 routinely trips this. Admin endpoint uses
  concurrency 2; tune lower if you increase batch sizes.
- **Body.search 255-char limit.** Our `search_anchor` is 150 chars; if you
  edit the normalizer in [src/lib/ingestion/search-anchor.ts](src/lib/ingestion/search-anchor.ts)
  and the SQL backfill in [migration 0008](supabase/migrations/0008_word_addin_columns.sql)
  must stay in sync.
- **Office Dialog API needs `displayInIframe: false`** for cross-origin
  OAuth (Google/Azure refuse to load with X-Frame-Options DENY). Word
  Desktop opens a real window; Word Online opens a same-origin iframe
  initially that then navigates cross-origin.
- **`Office.context.ui.messageParent` must be called from the same domain
  the dialog was opened with**, OR the parent domain must be in the
  manifest's `<AppDomains>`. We have both.
- **PostgREST `cs.{...}` for array containment** — works for single values
  (`cs.{VALUE}`) and multiple (`cs.{V1,V2}`). Don't add spaces.
- **Vercel maxDuration cap on the admin endpoint = 300 s** (`maxDuration =
  300` in the route). Heavy backfills may need multiple invocations; re-run
  the endpoint until `still_failing: 0`.
- **`document.changeTrackingMode` is observable on the document object** —
  you must `ctx.document.load("changeTrackingMode"); await ctx.sync();`
  before reading. Forgetting this is the most common Word.js footgun.
- **Optimistic clause-action updates** in `useClauseActions` use functional
  setters to capture `prev` to avoid stale-closure deps. Don't change that
  pattern without adding `states` back to the `useCallback` deps (and
  accepting the resulting re-render cascade).

---

## 8 · Quick how-tos

### Start dev (full stack)

```
# Terminal 1: Next.js (port 3000)
npm run dev

# Terminal 2: Add-in (HTTPS port 3001 + Word sideload)
npm run start --workspace word-addin
```

`prestart` automatically regenerates icons + dev manifest.

### Run admin reanalyze

```
curl -X POST \
  -H "x-internal-secret: $(grep -E '^INTERNAL_PROCESSING_SECRET=' .env.local | cut -d= -f2-)" \
  http://localhost:3000/api/admin/reanalyze-unparseable
```

Returns `{ scanned, retried, succeeded, still_failing, contracts_touched }`.
Re-run until `still_failing: 0`. Single run takes 1–5 min depending on
backlog.

### Regenerate manifest for a different env

```
ADDIN_ORIGIN=https://addin.acme.com APP_ORIGIN=https://acme.com \
  npm run manifest:prod --workspace word-addin
```

Produces `word-addin/manifests/manifest.prod.xml` with the prod GUID
(`...d5`) and AppDomains pointing at `acme.com`.

### Replace placeholder icons with real artwork

Drop your own `icon-16.png`, `icon-32.png`, etc. (correct dimensions) into
`word-addin/assets/`. The generator script skips files that already exist,
so your artwork is never overwritten.

### Bump the schema for a new risk dimension

1. Edit [src/lib/risk/schemas.ts](src/lib/risk/schemas.ts) — adjust the Zod
   shape.
2. Edit [src/lib/risk/llm-analyzer.ts](src/lib/risk/llm-analyzer.ts) — update
   the `RISK_TOOL.input_schema` to match.
3. Update [src/lib/risk/prompts.ts](src/lib/risk/prompts.ts) instructions.
4. Test via [scripts/debug-analyzer.ts](scripts/debug-analyzer.ts) — run with
   a known sample clause and inspect the response.

### Run analyzer on one clause for debugging

```
set -a; source .env.local; set +a
npx tsx --require ./scripts/server-only-shim.cjs scripts/debug-analyzer.ts
```

Expected: latencies in 2.5–4 s/clause, `failedToParse: false` on every clause.

---

## 9 · Glossary

| Term | Meaning |
|---|---|
| `addin` / `add-in` | Office Add-in. The Word task-pane app under `/word-addin`. |
| `clause` | A single clause/section in a parsed contract. DB row in `clauses`. |
| `contractId` | UUID for a contract row. Used throughout the API. |
| `search_anchor` | Normalized first-150-chars fingerprint of `clause_text` used to locate clauses via Word's `body.search`. |
| `RefBundle` | One legal corpus snippet returned by the chat endpoint's `refs` event. Has `ref_id` (REF_1…), `citation`, `url`, `source`, `snippet`. |
| `tool_use` | Anthropic feature that forces the model's response into a typed JSON shape declared via `input_schema`. |
| `RLS` | Postgres Row-Level Security. All Clauseium tables are RLS-scoped to `owner_user_id`. |
| `LLM_PARSE_FAILED` | Marker pushed onto `risk_rule_ids` when the analyzer falls back to the soft "Manual review recommended" response. Admin endpoint filters on this. |
| `NON_SUBSTANTIVE` | Marker pushed onto `risk_rule_ids` for content (preambles, page markers, bare titles) the orchestrator filtered out before sending to the LLM. |
| `clause-action` | A per-user decision on a clause: `accepted` / `modified` / `rejected`. Stored in `clause_actions` table. |
| `track-changes-consent` | LocalStorage flag: `accepted` (apply redlines as tracked changes) or `clipboard_only` (copy redline to clipboard, don't mutate doc). |
| `Office Dialog API` | `Office.context.ui.displayDialogAsync` — how the add-in opens an OAuth flow window. |
| `messageParent` | `Office.context.ui.messageParent(json)` — how the dialog returns OAuth tokens to the task pane. |
| `getAuthedContext` | The single backend helper that resolves `{ user, supabase }` from either a Bearer header or cookies. |
| `apiFetch` / `apiFetchRaw` | Add-in fetch wrappers. `apiFetch` throws on non-2xx; `apiFetchRaw` doesn't (used for streaming where we need fine-grained status mapping). |
| `officeReady` | Promise-wrapped `Office.onReady` with 1500 ms timeout fallback. |
| `DPDP` | Digital Personal Data Protection Act, 2023 (India). Drives our retention + consent UX. |

---

## 10 · What's explicitly NOT in MVP

Defer to v1.1:

- Full document editing inside the task pane (only redline replacement is in).
- Playbook selection per upload.
- Bulk review (multiple contracts at once).
- `.pdf` upload via add-in (web app remains the .pdf path).
- Microsoft Entra SSO via `OfficeRuntime.auth.getAccessToken()` — Supabase
  OAuth is enough for now.
- Content-control-based clause anchoring (longer-term replacement for the
  fingerprint-search approach).
- Reconciliation of user-rejected tracked changes back into clause-actions
  state.
- Offline mode.
- AppSource submission.
- Custom branding upload (the auto-generated § icons are placeholders).
- Granular DPDP toggle for >30-day retention (currently 30-day default with no
  opt-in for longer; UI not implemented).
- Real-time collaboration on the same contract.

---

## 11 · External services

| Service | Purpose | Env var |
|---|---|---|
| **Supabase** | Postgres + Auth + RLS + Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Anthropic** | LLM (Claude Haiku 4.5) — risk analysis + chat | `ANTHROPIC_API_KEY` |
| **OpenAI** | Embeddings only — `text-embedding-3-small` for the legal corpus RAG index | `OPENAI_API_KEY` |
| **Indian Kanoon** | Citation verification against case law database | `INDIAN_KANOON_API_TOKEN` (optional — degrades to local-corpus-only if absent) |
| **Microsoft / Office.js** | CDN at `appsforoffice.microsoft.com` for the Office.js bridge | none (loaded via `<script>` in `taskpane.html`) |

Internal-only:
- `INTERNAL_PROCESSING_SECRET` — gates `/api/contracts/[id]/process` and `/api/admin/reanalyze-unparseable`.
- `ADDIN_ORIGIN` — comma-separated origin allow-list for CORS on `/api/*`.
- `APP_ORIGIN_STAGING`, `ADDIN_ORIGIN_STAGING`, etc. — manifest builder reads
  these when running `npm run manifest:staging|prod`.

---

## 12 · Bug-fix history (so you know the rakes)

These have all been fixed; included here so future edits don't recreate the
problems:

1. **80% of MSA clauses showing "Risk analyzer returned an unparseable response"** —
   `max_tokens=600` truncated tool-use JSON, AND Zod `.max(600)` rejected
   valid verbose output. Fixed in
   [llm-analyzer.ts](src/lib/risk/llm-analyzer.ts) (1500 max_tokens) +
   [schemas.ts](src/lib/risk/schemas.ts) (removed upper caps on text fields).
2. **Admin endpoint not picking up legacy broken rows** — PostgREST `ilike`
   uses `*` wildcards; my filter had SQL `%` wildcards. Fixed in
   [route.ts:31](src/app/api/admin/reanalyze-unparseable/route.ts#L31).
3. **Bulk reanalyze hitting Anthropic rate limit** — default concurrency 4
   too high. Admin endpoint now passes `concurrency: 2`.
4. **Bearer auth validated but DB queries returned empty** — initial design
   had `getCurrentUserFromRequest` validate token but routes still called
   `createClient()` (cookies). Fixed by introducing `getAuthedContext` that
   returns both `user` and `supabase` from a single auth check.
5. **`Word.Range.scrollIntoView` doesn't exist** — used DOM Range from
   muscle memory. Switched to `range.select("Start")` in document-writer.
6. **XML comments with `npm run start --workspace`** — `--` is not allowed
   inside XML comments. Rewrote the manifest template's header comment.
7. **macOS Pages opening sideloaded .docx** — `office-addin-debugging start`
   uses macOS `open`, which uses the default `.docx` handler. Manual fix:
   set Word as default. The NotInWordExplainer now also catches this case at
   runtime.
8. **Stale-closure dep** in `useClauseActions` setAction/clearAction —
   depended on `states`, re-creating callback identity every render. Fixed
   with functional setter capturing prev.
9. **Office.onReady hanging** in Safari / Pages contexts — never fires
   outside Office. Added 1500 ms timeout in `officeReady()`.
10. **`tool_choice` requires `displayInIframe: false`** — Google/Azure OAuth
    refuses to load in same-origin iframe. Set in auth-dialog.ts.

---

## 13 · For future LLM edits — read this first

If you're an LLM picking up this codebase to make a change:

1. **Check this doc + [.claude/CLAUDE.md](.claude/CLAUDE.md) first.** Both
   define conventions that won't be obvious from grepping.
2. **Don't share components across the add-in / web boundary** — copy and
   mark in both spots when you change them.
3. **Touching the analyzer schema or prompt** → run
   [scripts/debug-analyzer.ts](scripts/debug-analyzer.ts) to verify before
   shipping.
4. **Touching the manifest** → remember XML comments + `<AppDomains>` must
   cover every cross-origin redirect.
5. **Touching the Office.js bridge** → typecheck against `@types/office-js`,
   don't assume DOM APIs (Range.scrollIntoView, etc.) exist on Word types.
6. **Touching the chat code** → never reach for `EventSource`. Use `fetch`
   with `response.body.getReader()` and split on `\n\n`.
7. **Touching Supabase queries** → confirm RLS policies. The `service-role`
   client bypasses RLS; the `bearer`/`server` clients don't.
8. **Adding a new route** → use `getAuthedContext(req)` for auth; don't
   reach for `getCurrentUser()` (cookie-only) or `createClient()`
   independently.
9. **Adding a localStorage key in the add-in** → prefix with `clauseium.addin.`
   and add version suffix (`.v1`). Update the ErrorBoundary's sign-out list
   in [Error.tsx](word-addin/src/taskpane/routes/Error.tsx).
10. **Adding a new env var** → update all three: `.env.local.example`,
    `webpack.config.js` DefinePlugin (if it's add-in-public), and this doc.
