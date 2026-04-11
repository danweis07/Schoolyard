-- 0001_tenant.sql
-- Tenant tables: districts group schools, schools are the RLS anchor.
-- Every subsequent content + dynamic table references schools.id.

create extension if not exists "pgcrypto";

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.districts is
  'School districts. Groups schools for cross-school aggregation and district-level admins.';

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references public.districts(id) on delete set null,
  slug text not null unique,
  name text not null,
  short_name text,
  -- Resolution: Astro middleware looks up the school by `domain` (subdomain
  -- or custom apex) first, then falls back to `path_slug` for /s/<slug>.
  domain text unique,
  path_slug text unique,
  branding jsonb not null default '{}'::jsonb,
  languages jsonb not null default '{}'::jsonb,
  modules jsonb not null default '{}'::jsonb,
  backend text not null default 'supabase' check (backend in ('static', 'supabase')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.schools is
  'Schools are the RLS anchor — every content and dynamic row is scoped to a school.';
comment on column public.schools.domain is
  'Custom domain or subdomain used by Astro middleware to resolve which school owns a request.';
comment on column public.schools.path_slug is
  'URL path slug used when the deploy serves multiple schools under /s/<slug>/...';

create index if not exists schools_district_id_idx on public.schools(district_id);

-- Keep `updated_at` fresh on every row update.
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists schools_touch_updated_at on public.schools;
create trigger schools_touch_updated_at
  before update on public.schools
  for each row execute function public.tg_touch_updated_at();
