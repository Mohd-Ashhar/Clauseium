-- Clauseium leads: email capture for gated downloads + newsletter.
-- Service-role inserts only; no anon read.

create extension if not exists citext;

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null,
  source        text not null check (source in (
    'template_download',
    'newsletter',
    'demo_book',
    'free_trial'
  )),
  content_slug  text,
  template_id   text,
  utm           jsonb,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create unique index if not exists leads_email_source_slug_uniq
  on public.leads (email, source, coalesce(content_slug, ''));

create index if not exists leads_created_idx
  on public.leads (created_at desc);

alter table public.leads enable row level security;

-- No anon SELECT/INSERT — only service role writes (it bypasses RLS).
drop policy if exists "leads_no_anon_select" on public.leads;
create policy "leads_no_anon_select"
  on public.leads for select
  to anon, authenticated
  using (false);

drop policy if exists "leads_no_anon_insert" on public.leads;
create policy "leads_no_anon_insert"
  on public.leads for insert
  to anon, authenticated
  with check (false);

-- Storage bucket for downloadable templates (private; service-role signs URLs).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'templates', 'templates', false, 26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;
