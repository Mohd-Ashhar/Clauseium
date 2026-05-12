-- Clauseium Word add-in support: two columns the add-in needs.
--   contracts.content_sha256 — SHA-256 of the uploaded .docx bytes,
--     computed client-side. The add-in queries
--     /api/contracts/by-hash/:sha256 on document open so a previously
--     reviewed file isn't re-uploaded and re-analyzed.
--   clauses.search_anchor — first 150 chars of clause_text, normalized
--     to be safe against Word's body.search() limits (255 chars; case
--     and curly-quote/whitespace mismatch). The add-in uses this to
--     locate the clause range when applying tracked-change redlines.
-- RLS: inherited from existing contracts/clauses policies — no new
-- policies needed.

alter table public.contracts
  add column if not exists content_sha256 text;

create index if not exists contracts_owner_sha256_idx
  on public.contracts (owner_user_id, content_sha256)
  where content_sha256 is not null;

alter table public.clauses
  add column if not exists search_anchor text;

-- Backfill existing rows. Mirrors the TypeScript normalizer that the
-- ingestion pipeline will run on new clauses:
--   1. strip soft hyphens (U+00AD)
--   2. fold curly quotes to ASCII (U+2018/2019/201C/201D → ' '/'/"/")
--   3. collapse whitespace runs to a single space
--   4. trim leading/trailing whitespace
--   5. take the first 150 chars
update public.clauses
set search_anchor = left(
  btrim(
    regexp_replace(
      translate(
        replace(clause_text, U&'\00AD', ''),
        U&'\2018\2019\201C\201D',
        E'\'\'""'
      ),
      '\s+',
      ' ',
      'g'
    )
  ),
  150
)
where search_anchor is null;
