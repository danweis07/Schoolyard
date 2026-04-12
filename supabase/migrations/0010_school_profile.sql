-- 0010_school_profile.sql
-- Adds remaining profile columns not covered by 0007_school_profile.sql:
-- website, title_one, timezone, and the 'social' alias JSONB column.
-- Uses `if not exists` so it is safe to run after 0007.

alter table public.schools
  add column if not exists website text not null default '',
  add column if not exists title_one boolean not null default false,
  add column if not exists timezone text not null default 'America/Los_Angeles';
