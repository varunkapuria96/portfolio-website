-- Adds a location preference used to weight job match scoring.
-- Run this in the Supabase SQL editor after resume_profile_schema.sql.

alter table resume_profile add column if not exists location_preference text;
