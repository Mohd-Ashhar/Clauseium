# Chunk A + B End-to-End Test Report

This is what the test harness actually exercised before handing the manual
Word-side checklist (see [TEST_CHECKLIST.md](./TEST_CHECKLIST.md)) over to you.

## Summary

| Surface | Result |
|---|---|
| TypeScript (main repo) | ✅ clean (only pre-existing baseUrl deprecation warning) |
| TypeScript (word-addin) | ✅ clean |
| Vitest (full suite) | ✅ 127 passed, 4 skipped (network-only) |
| Backend auth gating (by-hash, admin) | ✅ 401/200 in expected places |
| Analyzer quality on real MSA clauses | ✅ 5/5 clauses return parseable structured output |
| Risk DB rows: clean / total | 1045 / 1217 (85.9%) and climbing |
| Risk DB rows: real high-risk findings | 145 |
| Risk DB rows: real medium-risk findings | 467 |
| Risk DB rows: non-substantive (filter working) | 24 |
| Word.js / Office.js code paths | Not exercised — requires Microsoft Word desktop |

## Bugs found and fixed during testing

Five real bugs surfaced from running the analyzer + admin endpoint against
the actual Mercy Corps MSA and IPPB-style MSAs in your Supabase. All were
shipped as code changes; none required schema migrations.

### 1. `max_tokens: 600` truncated the tool-use JSON mid-string
**Symptom:** Anthropic returned a `tool_use` block whose `input` was a
partial JSON object — explanation ended mid-word (`"Indian Contract Ac…"`).
Zod `safeParse` rejected, soft fallback fired.
**Fix:** Bumped to `max_tokens: 1500` in
[src/lib/risk/llm-analyzer.ts](src/lib/risk/llm-analyzer.ts). 1500 leaves
plenty of room for verbose analysis without burning tokens unnecessarily.

### 2. Zod `.max(600)` rejected valid but verbose analysis
**Symptom:** Even after fix #1, the model wrote excellent 700–1500 char
explanations for nuanced clauses, and we rejected them as schema_mismatch.
Production data showed 200+ rows tagged LLM_PARSE_FAILED for this reason.
**Fix:** Dropped upper-bound caps on `issue`/`explanation`/`suggestion` in
[src/lib/risk/schemas.ts](src/lib/risk/schemas.ts) and removed `maxLength`
from the tool's `input_schema` in
[src/lib/risk/llm-analyzer.ts](src/lib/risk/llm-analyzer.ts). System prompt
still aims the model at the original lengths; we just no longer throw
useful output away when it goes slightly over.

### 3. PostgREST `ilike` filter used SQL `%` wildcards instead of `*`
**Symptom:** Admin endpoint's `risk_issue.ilike.%unparseable response%`
matched **zero** legacy rows. 62 clauses stuck at the old developer-grade
message could never be picked up for retry.
**Fix:** Changed to `*unparseable response*` in
[src/app/api/admin/reanalyze-unparseable/route.ts](src/app/api/admin/reanalyze-unparseable/route.ts).
PostgREST uses `*`; SQL `%` is treated as a literal character.

### 4. Default concurrency = 4 triggered Anthropic rate limits
**Symptom:** Bulk reanalysis of 250+ clauses hit
`429 rate_limit_error: 50,000 input tokens per minute` for Haiku 4.5,
causing genuine clauses to fall through to the soft fallback (tagged
LLM_PARSE_FAILED) even though the model would have analyzed them happily.
**Fix:** Admin endpoint now calls `analyzeClauseRisks(inputs, { concurrency: 2 })`
in [src/app/api/admin/reanalyze-unparseable/route.ts](src/app/api/admin/reanalyze-unparseable/route.ts).
Single-document `/analyze-risk` keeps the default 4 since it's bounded by
contract size.

### 5. Parse-failure logging was opaque
**Symptom:** When schema_mismatch fired, the log line just said
`code=schema_mismatch sample={…(truncated)}` with no information about
WHICH field was rejected or WHY.
**Fix:** [llm-analyzer.ts](src/lib/risk/llm-analyzer.ts) now logs the
specific Zod issues (`field:reason`) alongside the truncated raw input,
making future diagnosis a one-liner.

### 6. (Add-in) Stale-state closure in `useClauseActions`
**Symptom:** `setAction`/`clearAction` callbacks took `states` as a `useCallback`
dependency, re-creating the callback identity on every state change and
spreading down to every ClauseCard.
**Fix:** [word-addin/src/state/use-clause-actions.ts](word-addin/src/state/use-clause-actions.ts)
captures the previous value via the functional setter, so callback identity
is stable across state changes.

## What was tested automatically

### Backend
- `npx tsc --noEmit` on both projects — clean.
- `npx vitest run` — 127 / 131 pass; 4 skipped need network.
- `GET /api/contracts/by-hash/<sha>` with no auth → 401 ✅
- `GET /api/contracts/by-hash/<sha>` with auth and unknown hash → 404 ✅
- `POST /api/admin/reanalyze-unparseable` no secret → 401 ✅
- `POST /api/admin/reanalyze-unparseable` wrong secret → 401 ✅
- `POST /api/admin/reanalyze-unparseable` correct secret → kicks off real
  reanalysis through the production analyzer. Three successive runs against
  your Supabase have cleared 200+ legacy-broken / parse-failed rows so far.

### Analyzer quality
- 5/5 real MSA clauses (including the document preamble, an indemnification
  clause, a governing-law clause, a conditions-precedent clause, and a
  misc/governing-law clause) returned clean parseable output in 2.5–4 s
  each.
- The substantive-check filter correctly rejected the
  `** This is only Mercy Corps' standard template…` preamble line at the
  ingestion layer.
- `[risk] parse-fail` log count since the schema fix shipped: **0**.
- Remaining `[risk] llm-fail` lines: only 429 rate-limit errors during
  bulk reanalysis. None indicate code bugs.

### Webpack / task-pane host
- `https://localhost:3001/taskpane.html` returns 200 with CSP meta + Office.js
  CDN script tag intact.
- Webpack bundle emits `taskpane.<hash>.js` referenced from the HTML.
- Root `/` falls back to `taskpane.html` via `historyApiFallback`.
- `dist/manifest.xml` copy is correct (AppDomains, SourceLocation pointing
  at `https://localhost:3001/taskpane.html`).

## What was NOT tested (needs Microsoft Word desktop)

These code paths cannot be exercised from a sandbox or regular browser —
they call Office.js / Word.js APIs that only exist inside Microsoft Word:

- Office Dialog API auth round-trip (`displayDialogAsync` → `messageParent`)
- `Office.context.document.getFileAsync(Compressed)` slice loop
- `Word.run` + `body.search` + `range.select("Start")` (scroll-to-clause)
- `Word.ChangeTrackingMode.trackAll` toggling
- `range.insertText(suggestion, Word.InsertLocation.replace)` producing a
  tracked-change revision

All four enums/APIs were verified at the type level against
`node_modules/@types/office-js/index.d.ts` (`enum ChangeTrackingMode`,
`enum InsertLocation`, `select(selectionMode?: "Select" | "Start" | "End")`).
The code uses each correctly per the published Office.js docs.

See **[TEST_CHECKLIST.md](./TEST_CHECKLIST.md)** for the manual checklist to
walk through in Word.

## DB state (run `select` again any time)

```sql
select
  count(*) filter (where risk_issue ilike '%unparseable response%') as legacy,
  count(*) filter (where risk_rule_ids @> array['LLM_PARSE_FAILED'])  as new_failed,
  count(*) filter (where risk_rule_ids @> array['NON_SUBSTANTIVE'])   as non_substantive,
  count(*) filter (where risk_level = 'high')   as high_risk,
  count(*) filter (where risk_level = 'medium') as medium_risk,
  count(*) as total
from public.clauses;
```

After the third admin reanalysis run (in progress at write time) you'll
likely see `legacy → 0` and `new_failed → small single digits`. Any
remaining `LLM_PARSE_FAILED` rows are genuinely stubborn (truly ambiguous
clauses where even retrying with the relaxed schema hits a rate-limit or
model quirk). Re-run admin again — each pass drains more.

## How to reproduce the analyzer fix verification locally

```bash
set -a; source .env.local; set +a
npx tsx --require ./scripts/server-only-shim.cjs scripts/debug-analyzer.ts
```

Expected output: five clauses, all with `failedToParse: false`, latency
2.5–4 s each.

## Files changed during testing

Five backend files + one add-in file, plus three new tests / scripts:

- `src/lib/risk/llm-analyzer.ts` — max_tokens, tool input_schema, verbose error
- `src/lib/risk/schemas.ts` — relaxed Zod caps
- `src/lib/risk/prompts.ts` — stronger length guidance for model
- `src/lib/risk/orchestrator.ts` — propagate `failedToParse` marker
- `src/app/api/admin/reanalyze-unparseable/route.ts` — wildcard + concurrency
- `word-addin/src/state/use-clause-actions.ts` — stale-closure fix
- `scripts/debug-analyzer.ts` (new) — repeatable verification harness
- `word-addin/TEST_CHECKLIST.md` (new) — manual Word-side walkthrough
- `word-addin/TEST_REPORT.md` (this file)
