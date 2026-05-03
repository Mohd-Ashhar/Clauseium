-- Clauseium legal corpus: pgvector + globally-shared statutes/cases + hybrid search.

create extension if not exists vector;
create extension if not exists pg_trgm;

create table if not exists public.legal_documents (
  id            uuid primary key default gen_random_uuid(),
  source        text not null check (source in ('statute','case')),
  statute_name  text,
  section       text,
  court         text,
  year          integer,
  jurisdiction  text not null default 'India' check (jurisdiction = 'India'),
  case_name     text,
  citation      text,
  url           text,
  title         text not null,
  created_at    timestamptz not null default now(),
  unique (source, statute_name, section, case_name, citation)
);

create index if not exists legal_documents_source_idx
  on public.legal_documents (source);
create index if not exists legal_documents_statute_idx
  on public.legal_documents (statute_name, section);
create index if not exists legal_documents_case_idx
  on public.legal_documents (court, year);

create table if not exists public.legal_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.legal_documents(id) on delete cascade,
  ord          integer not null,
  text         text not null,
  metadata     jsonb not null,
  embedding    vector(1536) not null,
  tsv          tsvector generated always as (to_tsvector('english', text)) stored,
  created_at   timestamptz not null default now(),
  unique (document_id, ord)
);

create index if not exists legal_chunks_hnsw_idx
  on public.legal_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index if not exists legal_chunks_tsv_idx
  on public.legal_chunks using gin (tsv);
create index if not exists legal_chunks_trgm_idx
  on public.legal_chunks using gin (text gin_trgm_ops);
create index if not exists legal_chunks_doc_idx
  on public.legal_chunks (document_id);

alter table public.legal_documents enable row level security;
alter table public.legal_chunks    enable row level security;

drop policy if exists "legal_documents_read_authed" on public.legal_documents;
create policy "legal_documents_read_authed"
  on public.legal_documents for select
  to authenticated using (true);

drop policy if exists "legal_chunks_read_authed" on public.legal_chunks;
create policy "legal_chunks_read_authed"
  on public.legal_chunks for select
  to authenticated using (true);
-- Writes are performed by the service role, which bypasses RLS.

create or replace function public.hybrid_legal_search(
  q_embedding vector(1536),
  q_text      text,
  k_each      int default 30,
  k_final     int default 8
)
returns table (
  chunk_id     uuid,
  document_id  uuid,
  text         text,
  metadata     jsonb,
  semantic     real,
  lexical      real,
  fused        real
)
language sql stable as $$
  with sem as (
    select id, document_id, text, metadata,
           1 - (embedding <=> q_embedding) as score,
           row_number() over (order by embedding <=> q_embedding) as rnk
    from public.legal_chunks
    order by embedding <=> q_embedding
    limit k_each
  ),
  lex as (
    select id, document_id, text, metadata,
           ts_rank_cd(tsv, plainto_tsquery('english', q_text)) as score,
           row_number() over (order by ts_rank_cd(tsv, plainto_tsquery('english', q_text)) desc) as rnk
    from public.legal_chunks
    where tsv @@ plainto_tsquery('english', q_text)
    order by score desc
    limit k_each
  ),
  fused as (
    select coalesce(s.id, l.id)                  as id,
           coalesce(s.document_id, l.document_id) as document_id,
           coalesce(s.text, l.text)              as text,
           coalesce(s.metadata, l.metadata)      as metadata,
           coalesce(s.score, 0)::real            as semantic,
           coalesce(l.score, 0)::real            as lexical,
           (coalesce(1.0/(60 + s.rnk), 0) + coalesce(1.0/(60 + l.rnk), 0))::real as fused
    from sem s full outer join lex l on s.id = l.id
  )
  select id, document_id, text, metadata, semantic, lexical, fused
  from fused
  order by fused desc
  limit k_final;
$$;

grant execute on function public.hybrid_legal_search(vector, text, int, int) to authenticated;
