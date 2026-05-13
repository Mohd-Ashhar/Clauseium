# Word Add-In — Manual Test Checklist (Chunks A + B)

Use this after the dev servers are running and the manifest is sideloaded.
Items marked **[AUTO]** were verified by the test harness; **[WORD]** require
Microsoft Word desktop.

## Pre-flight

- [AUTO] `npm run dev` running on `http://localhost:3000`.
- [AUTO] `npm run dev --workspace word-addin` running on `https://localhost:3001`.
- [AUTO] Manifest sideloaded via `npm run start --workspace word-addin`.
- [AUTO] Migration 0008 applied to Supabase (`content_sha256`, `search_anchor`).
- [AUTO] Risk analyzer fix verified: 5/5 real MSA clauses return clean analysis
  in ~3 s each.
- [WORD] Microsoft Word installed on macOS; default-handler for `.docx` is
  Microsoft Word (not Pages).
- [WORD] A real saved `.docx` open in Word (NOT untitled). The plan's reference
  test set is a Mercy Corps MSA or any 5–25 page real contract.

## Chunk A — Document flow

### Sign-in → upload → analysis (cold start)

1. [WORD] Click **Clauseium → Review** in the Home ribbon. Task pane slides in.
2. [WORD] **SignedOut** screen shows with Google + Microsoft buttons + the
   DPDP 30-day disclosure.
3. [WORD] Click **Continue with Google** → dialog opens at
   `http://localhost:3000/addin-auth?provider=google`. Complete OAuth.
4. [WORD] Dialog auto-closes; task pane flips to **Workspace**.
5. [WORD] **ConsentDialog** appears once (overlay over Workspace) with the
   filename + byte size + "Continue / Cancel".
6. [WORD] Click **Continue**. **UploadProgress** card cycles:
   `reading → checking_hash → uploading → queued → processing → fetching_analysis → ready`.
7. [WORD] Workspace renders with real clause cards once `ready`.

### By-hash short-circuit (warm restart)

1. [WORD] Close the same `.docx` and reopen it in Word.
2. [WORD] Open the Clauseium task pane.
3. [WORD] No upload, no consent prompt. UploadProgress goes
   `reading → checking_hash → fetching_analysis → ready` in **< 2 s**.

### Error paths

1. [WORD] Open an *unsaved* (Untitled) Word doc; sign in. Expect error card:
   **"Save the document first"** with a Try again button.
2. [WORD] Attempt to upload a `.docx` > 25 MB. Expect error card:
   **"Document is XX.X MB. Clauseium accepts up to 25 MB."**
3. [AUTO] Sign in once, then call `/api/contracts/by-hash/<wrong-hash>` with no
   auth → 401. With auth and a non-existing hash → 404.

## Chunk B — Word.js + clause-actions

### Click clause → scroll Word

1. [WORD] In Workspace, click any clause card.
2. [WORD] Word's viewport scrolls to that clause; cursor lands at the start.
3. [WORD] If the clause text was edited in Word since last analysis (try
   manually inserting a word mid-sentence): clicking the card silently fails
   to scroll. No error toast (this is an expected best-effort behavior).

### Accept redline → tracked change

1. [WORD] Expand any **High** clause with a suggested redline.
2. [WORD] Click **Accept redline**. **TrackChangesPrompt** appears (overlay
   with 3 options: Apply as tracked change / Copy to clipboard / Cancel).
3. [WORD] Click **Apply as tracked change**.
   - Word toggles Track Changes mode to TrackAll if it was off.
   - The clause text in Word body is replaced with the suggestion as a
     single tracked-change revision (strikethrough old + insertion new).
   - Toast: **"Redline applied as a tracked change in §X."**
   - Card border turns green; expanded body says "Redline applied as a
     tracked change in the document."
4. [WORD] Open Word's **Review** tab. Confirm the revision is visible and
   accept/reject works there.
5. [WORD] Click **Accept redline** on a different clause. No prompt this
   time (consent persisted in `localStorage`). Goes straight to applied.

### Clipboard-only path

1. [WORD] In a browser DevTools console (open in the task pane via right-click
   → Inspect), clear track-changes consent:
   `localStorage.removeItem('clauseium.addin.track-changes-consent.v1')`.
2. [WORD] Click Accept redline on a clause. Prompt appears again.
3. [WORD] Click **Copy to clipboard instead**.
4. [WORD] No change in the Word document body. Suggestion is in the clipboard
   (paste anywhere to verify). Clause-action still flips to `accepted` on the
   server.
5. [WORD] Click Cancel on the next prompt that fires (via the clipboard-only
   path persists, so this requires another reset). Verify NO change to the
   clause's state.

### Reject

1. [WORD] Click **Reject** on any clause. No Word document mutation. Toast:
   **"Rejected suggestion for §X."** Card opacity drops; body shows
   "Suggestion rejected — original clause text retained."

### Couldn't-locate-clause

1. [WORD] Manually edit the clause text in the Word body so the first 150
   chars no longer match the analyzed text. (Insert a word mid-sentence.)
2. [WORD] Click Accept redline on that same clause card. Toast:
   **"Couldn't locate this clause in the document. It may have been edited."**
   No mutation, no clause-action persisted.

### Decision persistence

1. [WORD] Accept redline on §A, Reject §B.
2. [WORD] Sign out (top-right log-out icon).
3. [WORD] Sign back in. Both decisions appear restored on the clause cards
   (§A green + accepted state, §B greyed + rejected state). Server-hydrated
   via `useClauseActions`.

## Backend behavior (no Word needed)

### Auth gating
- [AUTO] `GET /api/contracts/by-hash/<sha256>` without auth → 401.
- [AUTO] `POST /api/admin/reanalyze-unparseable` without secret → 401.
- [AUTO] `POST /api/admin/reanalyze-unparseable` with secret → 200 + JSON
  `{ scanned, retried, succeeded, still_failing, contracts_touched }`.

### Risk analyzer quality
- [AUTO] Five sample MSA clauses (real Mercy Corps + IPPB contract text) all
  return parseable structured output in 2.5–4 s each.
- [AUTO] No `[risk] parse-fail` log lines since the analyzer fix shipped.
- [AUTO] Substantive-check rejects template comments (`** This is...`),
  page markers, bare titles, etc., with no LLM call.

## Known issues / not blockers

- macOS Pages doesn't run Office Add-ins. If a `.docx` opens in Pages, the
  ribbon button won't appear — this isn't a bug in our code, it's Apple
  defaulting to Pages. Fix: Finder → `.docx` → Get Info → Open with →
  Microsoft Word → Change All.
- The first run of `/api/admin/reanalyze-unparseable` after the schema-cap
  removal needs to grind through up to 1217 clauses on the LLM. May take
  several minutes. Vercel-style 5-min cap will require splitting in prod;
  fine for dev.
- The clipboard fallback in `applyRedline` requires a user gesture and may
  silently fail in some Office hosts. Decision is still persisted server-side.
