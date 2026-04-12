-- 0010_school_profile.sql
-- Add profile columns to schools table so admins can manage school
-- identity, contact info, and social links through the admin UI.
-- Also adds an RLS policy for school-level admin updates.

-- ── New scalar columns on schools ─────────────────────────────────
alter table public.schools
  add column if not exists tagline text not null default '',
  add column if not exists mascot text not null default '',
  add column if not exists address text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists website text not null default '',
  add column if not exists grades text not null default '',
  add column if not exists founded text not null default '',
  add column if not exists enrollment integer not null default 0,
  add column if not exists title_one boolean not null default false,
  add column if not exists timezone text not null default 'America/Los_Angeles',
  add column if not exists social jsonb not null default '{}'::jsonb;

-- ── RLS: school admin can update own school row ───────────────────
-- The existing "public read schools" policy covers SELECT.
-- The existing "district_admin manages schools" policy covers district admins.
-- This new policy lets school-level admins (admin role) update their own school.
drop policy if exists "school_admin updates own school" on public.schools;
create policy "school_admin updates own school" on public.schools
  for update using (
    public.is_school_admin(id)
  ) with check (
    public.is_school_admin(id)
  );
