-- Adds resume match scoring columns to job_finds.
-- Run this in the Supabase SQL editor after job_finds_schema.sql.

alter table job_finds add column if not exists match_score int;
alter table job_finds add column if not exists match_reason text;
