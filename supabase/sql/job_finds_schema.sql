-- Job Finds schema (staged postings discovered by the refresh-company-jobs edge function)
-- Run this in the Supabase SQL editor after jobs_schema.sql, before using "Refresh Jobs".

create table if not exists job_finds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  location text,
  job_url text not null,
  status text not null default 'pending' check (status in ('pending', 'dismissed')),
  discovered_at timestamptz not null default now(),
  unique (user_id, job_url)
);

alter table job_finds enable row level security;

create policy "Users manage their own job finds" on job_finds
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists job_finds_company_id_idx on job_finds(company_id);
