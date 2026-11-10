-- Resume Screening Assistant: database setup.
-- Run once in the Supabase SQL editor of a new project.

-- Trigram search for candidate names.
create extension if not exists pg_trgm with schema extensions;

create table public.analyses (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  candidate_name   text not null check (char_length(candidate_name) between 1 and 200),
  profile          jsonb not null,
  job_title        text check (char_length(job_title) <= 200),
  job_description  text not null check (char_length(job_description) <= 10000),
  match_score      smallint not null check (match_score between 0 and 100),
  report           jsonb not null,
  model_used       text not null
);

-- Row Level Security on, with no policies: Supabase's public API cannot read or write the table.
-- Only the server, using the secret key, can reach it.
alter table public.analyses enable row level security;
revoke all on table public.analyses from anon, authenticated;

create index analyses_created_at_idx on public.analyses (created_at desc);
create index analyses_match_score_idx on public.analyses (match_score);
create index analyses_candidate_name_trgm_idx
  on public.analyses using gin (candidate_name extensions.gin_trgm_ops);

-- Autocomplete: up to 8 distinct names containing the search text, names starting with it first.
-- LIKE wildcards in the search text are escaped, so they match literally.
create or replace function public.suggest_candidate_names(search text)
returns table (suggestion text)
language plpgsql
stable
set search_path = ''
as $$
declare
  pattern text := replace(replace(replace(search, '\', '\\'), '%', '\%'), '_', '\_');
begin
  return query
    select s.name
    from (
      select distinct a.candidate_name as name
      from public.analyses a
      where a.candidate_name ilike '%' || pattern || '%'
    ) s
    order by (s.name ilike pattern || '%') desc, s.name
    limit 8;
end;
$$;

-- The function may only be called by the server.
revoke execute on function public.suggest_candidate_names(text) from public, anon, authenticated;
grant execute on function public.suggest_candidate_names(text) to service_role;
