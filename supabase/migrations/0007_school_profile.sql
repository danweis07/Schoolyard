-- 0007_school_profile.sql
-- Adds school profile columns to the schools table so the onboarding
-- wizard and school profile page can store/display identity, contact,
-- and social information directly in Postgres.
--
-- Previously these fields lived only in school.config.json. Schools
-- using the supabase backend need them in the DB so the admin UI can
-- read and write them without touching the config file.

-- ── New columns ─────────────────────────────────────────────────────
alter table public.schools
  add column if not exists address text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists tagline text not null default '',
  add column if not exists mascot text not null default '',
  add column if not exists grades text not null default '',
  add column if not exists founded text not null default '',
  add column if not exists enrollment integer not null default 0,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

comment on column public.schools.social_links is
  'Social media URLs: { instagram?, facebook?, twitter?, youtube? }';

-- ── RLS: let school admins update their own school row ──────────────
-- The existing "district_admin manages schools" policy (0004_rls.sql)
-- only covers district_admin. School-level admins need to update their
-- own school's profile fields, branding, and module config.
drop policy if exists "admin updates own school" on public.schools;
create policy "admin updates own school" on public.schools
  for update using (public.is_school_admin(id))
          with check (public.is_school_admin(id));
