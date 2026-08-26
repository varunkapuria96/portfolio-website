-- Jobs App schema
-- Run this in the Supabase SQL editor (Project > SQL Editor) before using /projects/jobs.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  careers_url text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  company_id uuid references companies(id) on delete set null,
  title text not null,
  location text,
  job_url text,
  source text not null default 'linkedin' check (source in ('linkedin', 'company_site', 'referral', 'other')),
  description text,
  status text not null default 'saved' check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived')),
  applied_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  name text not null,
  role_title text,
  linkedin_url text,
  email text,
  outreach_status text not null default 'not_contacted' check (outreach_status in ('not_contacted', 'messaged', 'replied', 'meeting_scheduled', 'no_response')),
  notes text,
  last_contacted_at date,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;
alter table jobs enable row level security;
alter table contacts enable row level security;

create policy "Users manage their own companies" on companies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own jobs" on jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage their own contacts" on contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists jobs_company_id_idx on jobs(company_id);
create index if not exists contacts_company_id_idx on contacts(company_id);
create index if not exists contacts_job_id_idx on contacts(job_id);
