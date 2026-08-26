-- Resume Profile schema (one resume per user, used for job match scoring)
-- Run this in the Supabase SQL editor before uploading a resume.

create table if not exists resume_profile (
  user_id uuid primary key references auth.users on delete cascade,
  filename text not null,
  resume_text text not null,
  updated_at timestamptz not null default now()
);

alter table resume_profile enable row level security;

create policy "Users manage their own resume" on resume_profile
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
