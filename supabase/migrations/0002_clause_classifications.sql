-- Clause classifications: per-clause category labels with versioning.

do $$ begin
  create type clause_category as enum (
    'indemnification',
    'limitation_of_liability',
    'termination',
    'governing_law',
    'jurisdiction',
    'data_protection_dpdp',
    'payment_terms',
    'ip_assignment',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type classification_method as enum ('rule', 'llm', 'rule_llm_agree');
exception when duplicate_object then null; end $$;

create table if not exists public.clause_classifications (
  id            uuid primary key default gen_random_uuid(),
  clause_id     uuid not null references public.clauses(id) on delete cascade,
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  run_id        uuid not null,
  category      clause_category not null,
  confidence    numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  method        classification_method not null,
  matched_rule  text,
  model         text,
  reasoning     text,
  classified_at timestamptz not null default now()
);

create index if not exists clause_classifications_clause_idx
  on public.clause_classifications (clause_id, classified_at desc);

create index if not exists clause_classifications_contract_run_idx
  on public.clause_classifications (contract_id, run_id);

create index if not exists clause_classifications_category_idx
  on public.clause_classifications (contract_id, category);

create unique index if not exists clause_classifications_clause_run_uq
  on public.clause_classifications (clause_id, run_id);

alter table public.clause_classifications enable row level security;

drop policy if exists "clf_select_own" on public.clause_classifications;
create policy "clf_select_own"
  on public.clause_classifications for select
  using (
    exists (
      select 1 from public.contracts c
      where c.id = clause_classifications.contract_id
        and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "clf_insert_own" on public.clause_classifications;
create policy "clf_insert_own"
  on public.clause_classifications for insert
  with check (
    exists (
      select 1 from public.contracts c
      where c.id = clause_classifications.contract_id
        and c.owner_user_id = auth.uid()
    )
  );
