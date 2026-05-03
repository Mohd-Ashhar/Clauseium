-- Clauseium ingestion schema: contracts, clauses, storage bucket + RLS.

do $$ begin
  create type contract_status as enum ('queued', 'processing', 'ready', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.contracts (
  id                uuid primary key default gen_random_uuid(),
  owner_user_id     uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  original_filename text not null,
  mime_type         text not null check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  file_size_bytes   bigint not null check (file_size_bytes > 0 and file_size_bytes <= 26214400),
  page_count        integer,
  storage_path      text not null unique,
  status            contract_status not null default 'queued',
  error_message     text,
  structured_json   jsonb,
  uploaded_at       timestamptz not null default now(),
  processed_at      timestamptz
);

create index if not exists contracts_owner_idx
  on public.contracts (owner_user_id, uploaded_at desc);

create index if not exists contracts_queued_idx
  on public.contracts (uploaded_at)
  where status in ('queued', 'processing');

alter table public.contracts enable row level security;

drop policy if exists "contracts_select_own" on public.contracts;
create policy "contracts_select_own"
  on public.contracts for select
  using (owner_user_id = auth.uid());

drop policy if exists "contracts_insert_own" on public.contracts;
create policy "contracts_insert_own"
  on public.contracts for insert
  with check (owner_user_id = auth.uid());

drop policy if exists "contracts_update_own" on public.contracts;
create policy "contracts_update_own"
  on public.contracts for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create table if not exists public.clauses (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references public.contracts(id) on delete cascade,
  section_title    text not null,
  section_position integer not null,
  clause_number    text,
  clause_text      text not null,
  position         integer not null,
  created_at       timestamptz not null default now(),
  unique (contract_id, position)
);

create index if not exists clauses_contract_idx
  on public.clauses (contract_id, position);

alter table public.clauses enable row level security;

drop policy if exists "clauses_select_own" on public.clauses;
create policy "clauses_select_own"
  on public.clauses for select
  using (
    exists (
      select 1 from public.contracts c
      where c.id = clauses.contract_id and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "clauses_insert_own" on public.clauses;
create policy "clauses_insert_own"
  on public.clauses for insert
  with check (
    exists (
      select 1 from public.contracts c
      where c.id = clauses.contract_id and c.owner_user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts', 'contracts', false, 26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

drop policy if exists "contracts_storage_read_own" on storage.objects;
create policy "contracts_storage_read_own"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts_storage_insert_own" on storage.objects;
create policy "contracts_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts_storage_delete_own" on storage.objects;
create policy "contracts_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
