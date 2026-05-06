-- Clauseium clause actions: per-user accept/modify/reject decisions on
-- clauses. RLS chains through contracts.owner_user_id (tenant-scoped),
-- mirroring the clauses policy pattern in 0001_ingestion_schema.sql.

create table if not exists public.clause_actions (
  id              uuid        primary key default gen_random_uuid(),
  clause_id       uuid        not null references public.clauses(id) on delete cascade,
  owner_user_id   uuid        not null references auth.users(id)     on delete cascade,
  state           text        not null
    check (state in ('accepted','modified','rejected')),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (clause_id, owner_user_id)
);

create index if not exists clause_actions_clause_idx
  on public.clause_actions (clause_id);
create index if not exists clause_actions_owner_idx
  on public.clause_actions (owner_user_id);

alter table public.clause_actions enable row level security;

drop policy if exists "clause_actions_select_own" on public.clause_actions;
create policy "clause_actions_select_own"
  on public.clause_actions for select
  using (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.clauses cl
      join public.contracts co on co.id = cl.contract_id
      where cl.id = clause_actions.clause_id
        and co.owner_user_id = auth.uid()
    )
  );

drop policy if exists "clause_actions_insert_own" on public.clause_actions;
create policy "clause_actions_insert_own"
  on public.clause_actions for insert
  with check (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.clauses cl
      join public.contracts co on co.id = cl.contract_id
      where cl.id = clause_actions.clause_id
        and co.owner_user_id = auth.uid()
    )
  );

drop policy if exists "clause_actions_update_own" on public.clause_actions;
create policy "clause_actions_update_own"
  on public.clause_actions for update
  using (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.clauses cl
      join public.contracts co on co.id = cl.contract_id
      where cl.id = clause_actions.clause_id
        and co.owner_user_id = auth.uid()
    )
  )
  with check (
    owner_user_id = auth.uid()
  );

drop policy if exists "clause_actions_delete_own" on public.clause_actions;
create policy "clause_actions_delete_own"
  on public.clause_actions for delete
  using (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.clauses cl
      join public.contracts co on co.id = cl.contract_id
      where cl.id = clause_actions.clause_id
        and co.owner_user_id = auth.uid()
    )
  );

-- Touch updated_at on update.
create or replace function public.touch_clause_actions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clause_actions_touch_updated_at on public.clause_actions;
create trigger clause_actions_touch_updated_at
  before update on public.clause_actions
  for each row execute function public.touch_clause_actions_updated_at();
