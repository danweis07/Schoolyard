-- 0008_directory.sql
-- School Directory module: opt-in family directory where parents can
-- find each other. Privacy-safe — entirely opt-in, school-scoped,
-- behind auth. Anon gets nothing.

-- ── Directory entries ───────────────────────────────────────────────
create table if not exists public.directory_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  family_name text not null,
  parent_names text[] not null default '{}',
  student_grades text[] not null default '{}',
  email text,
  phone text,
  neighborhood text,
  notes text,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id)
);

comment on table public.directory_entries is
  'Opt-in family directory. One entry per family per school. Visible only to authenticated members of the same school.';
comment on column public.directory_entries.parent_names is
  'Array of parent/guardian names the family chooses to share.';
comment on column public.directory_entries.student_grades is
  'Array of grades, e.g. {K, 3rd}. Used for filtering.';
comment on column public.directory_entries.visible is
  'Family can hide their entry without deleting it.';

drop trigger if exists directory_entries_touch_updated_at on public.directory_entries;
create trigger directory_entries_touch_updated_at
  before update on public.directory_entries
  for each row execute function public.tg_touch_updated_at();

-- ── Indexes ─────────────────────────────────────────────────────────
create index if not exists directory_entries_school_visible_name_idx
  on public.directory_entries (school_id, visible, family_name);

create index if not exists directory_entries_user_idx
  on public.directory_entries (user_id);

-- ── RLS — NEW PATTERN: school-member reads ──────────────────────────
-- This is the first table where anon gets nothing. Reads require
-- authenticated membership in the same school.
alter table public.directory_entries enable row level security;

-- Members of the same school can read visible entries
drop policy if exists "school member read directory" on public.directory_entries;
create policy "school member read directory" on public.directory_entries
  for select using (
    visible = true
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.school_id = directory_entries.school_id
    )
  );

-- Users manage their own entry (insert, update, delete)
drop policy if exists "self manage directory" on public.directory_entries;
create policy "self manage directory" on public.directory_entries
  for all using (auth.uid() = user_id)
        with check (auth.uid() = user_id);

-- Admins read all entries (including hidden) for their school
drop policy if exists "admin read directory" on public.directory_entries;
create policy "admin read directory" on public.directory_entries
  for select using (public.is_school_admin(school_id));
