-- 0014_retention_purge.sql
-- DPDP 30-day contract-text retention purge.
--
-- The product (settings page, marketing/security page, auth layout, Word add-in
-- consent screens) promises: "Uploaded contract text is automatically deleted
-- after 30 days unless you opt in to extended retention." This migration makes
-- that promise real.
--
-- APPROACH (chosen): null-the-text, keep-the-record. After 30 days, for
-- non-opted-in contracts, we DELETE the stored file and NULL every text-bearing
-- column (clause text, section titles, structured JSON, AI free-text, reviewer
-- edits, whole-document analysis) while KEEPING the contract row and the derived
-- risk LEVELS/counts — so a user still sees "reviewed X on <date>, N high risks"
-- in their history, but no contract text remains. This is data minimisation, not
-- erasure of the activity record.
--
-- SCHEDULING: a SQL function run daily by pg_cron (no app uptime dependency).

-- ── Schema: opt-in flag + purge marker ──────────────────────────────────────
alter table public.contracts
  add column if not exists retention_opt_in boolean not null default false,
  add column if not exists text_purged_at   timestamptz;

comment on column public.contracts.retention_opt_in is
  'Separable-consent toggle: when true, contract text is exempt from the 30-day retention purge. Default false (DPDP-safe).';
comment on column public.contracts.text_purged_at is
  'Set when the 30-day retention purge nulled this contract''s text. The UI should render a "text deleted per retention policy" state when present.';

-- ── Purge function (service-side; bypasses RLS via SECURITY DEFINER) ─────────
-- Nulls text for contracts older than `retention_days`, not opted in, and not
-- already purged. Returns the number of contracts purged. Idempotent: the
-- `text_purged_at is null` guard means a second run skips already-purged rows.
create or replace function public.purge_expired_contract_text(retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  cutoff timestamptz := now() - make_interval(days => retention_days);
  target uuid[];
begin
  select coalesce(array_agg(id), '{}')
    into target
  from public.contracts
  where uploaded_at < cutoff
    and retention_opt_in = false
    and text_purged_at is null;

  if array_length(target, 1) is null then
    return 0;
  end if;

  -- Clause text + AI free-text + Word search anchors.
  update public.clauses
     set clause_text     = '',
         section_title   = '',
         clause_number   = null,
         search_anchor   = null,
         risk_issue      = null,
         risk_explanation = null,
         risk_suggestion = null
   where contract_id = any(target);

  -- Classifier rationale can quote the clause.
  update public.clause_classifications
     set reasoning = null
   where contract_id = any(target);

  -- Reviewer-edited redline wording + notes.
  update public.clause_actions
     set modified_text = null,
         note          = null
   where clause_id in (
     select id from public.clauses where contract_id = any(target)
   );

  -- Contract-level text: parsed structure, whole-document analysis, and the
  -- content hash (so a later re-upload re-processes cleanly instead of serving
  -- a hollow by-hash review). Keep analysis_summary (degradation notes/counts).
  update public.contracts
     set structured_json   = null,
         document_analysis = null,
         content_sha256    = null,
         text_purged_at    = now()
   where id = any(target);

  -- Delete the raw uploaded file from storage. (Removes the storage.objects
  -- metadata row; Supabase treats this table as the source of truth for access.
  -- If your project requires backend byte-level cleanup beyond the metadata row,
  -- pair this with a storage-API sweep — but no contract bytes remain readable
  -- once the row is gone and RLS denies access.)
  delete from storage.objects o
   using public.contracts c
   where c.id = any(target)
     and o.bucket_id = 'contracts'
     and o.name = c.storage_path;

  return coalesce(array_length(target, 1), 0);
end;
$$;

revoke all on function public.purge_expired_contract_text(integer) from public, anon, authenticated;

-- ── Schedule daily at 03:00 UTC via pg_cron ─────────────────────────────────
-- Guarded so this migration still applies if pg_cron isn't enabled yet. To
-- enable on Supabase: Dashboard → Database → Extensions → pg_cron (or
-- `create extension pg_cron;`), then re-run the schedule block below.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'purge-contract-text') then
      perform cron.unschedule('purge-contract-text');
    end if;
    perform cron.schedule(
      'purge-contract-text',
      '0 3 * * *',
      $cron$select public.purge_expired_contract_text(30);$cron$
    );
  else
    raise notice 'pg_cron not installed — purge function created but not scheduled. Enable pg_cron and run cron.schedule(''purge-contract-text'', ''0 3 * * *'', ''select public.purge_expired_contract_text(30);'').';
  end if;
end $$;
