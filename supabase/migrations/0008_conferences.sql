-- ============================================================
-- 0008_conferences.sql — Parent-teacher conference scheduling
-- ============================================================

-- ── conference_windows (grouping for a conference period) ────

create table if not exists public.conference_windows (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  slug        text not null,
  title       text not null,
  description text,

  starts_on   date not null,
  ends_on     date not null,

  published   boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (school_id, slug)
);

create trigger tg_conference_windows_updated_at
  before update on public.conference_windows
  for each row execute function public.tg_touch_updated_at();

-- ── conference_slots (individual bookable time slots) ────────

create table if not exists public.conference_slots (
  id               uuid primary key default gen_random_uuid(),
  window_id        uuid not null references public.conference_windows(id) on delete cascade,
  school_id        uuid not null references public.schools(id) on delete cascade,

  teacher_id       uuid not null references auth.users(id) on delete cascade,
  teacher_name     text not null,

  date             date not null,
  start_time       time not null,
  end_time         time not null,
  duration_minutes integer not null default 15 check (duration_minutes > 0),
  location         text,

  -- null = open, non-null = booked
  booked_by        uuid references auth.users(id) on delete set null,
  booked_at        timestamptz,
  student_name     text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Prevent double-booking: one slot per teacher per (window, date, start_time)
  unique (window_id, teacher_id, date, start_time)
);

create trigger tg_conference_slots_updated_at
  before update on public.conference_slots
  for each row execute function public.tg_touch_updated_at();

-- ── RPC: Atomic slot booking with conflict prevention ────────

create or replace function public.book_conference_slot(
  p_slot_id uuid,
  p_student_name text default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_slot record;
begin
  -- Lock the row to prevent race conditions
  select * into v_slot
    from public.conference_slots
   where id = p_slot_id
   for update;

  if not found then
    return false;
  end if;

  -- Already booked
  if v_slot.booked_by is not null then
    return false;
  end if;

  -- Check: user hasn't already booked this teacher in this window
  if exists (
    select 1 from public.conference_slots
     where window_id = v_slot.window_id
       and teacher_id = v_slot.teacher_id
       and booked_by = auth.uid()
  ) then
    return false;
  end if;

  update public.conference_slots
     set booked_by = auth.uid(),
         booked_at = now(),
         student_name = p_student_name
   where id = p_slot_id;

  return true;
end;
$$;

-- Only authenticated users can call this
revoke all on function public.book_conference_slot(uuid, text) from public;
grant execute on function public.book_conference_slot(uuid, text) to authenticated;

-- ── RLS ──────────────────────────────────────────────────────

alter table public.conference_windows enable row level security;

-- Public can read published windows
create policy "public read published conference_windows"
  on public.conference_windows for select
  using (published = true);

-- Editors can read all windows and write
create policy "editor write conference_windows"
  on public.conference_windows for all
  using (public.is_school_editor(school_id))
  with check (public.is_school_editor(school_id));

alter table public.conference_slots enable row level security;

-- Public can read slots under published windows
create policy "public read conference_slots"
  on public.conference_slots for select
  using (
    exists (
      select 1 from public.conference_windows w
       where w.id = conference_slots.window_id
         and w.published = true
    )
  );

-- Teachers can manage their own slots
create policy "teacher manage own slots"
  on public.conference_slots for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Editors can manage all slots for their school
create policy "editor write conference_slots"
  on public.conference_slots for all
  using (public.is_school_editor(school_id))
  with check (public.is_school_editor(school_id));

-- ── Indexes ──────────────────────────────────────────────────

create index if not exists conference_windows_school_idx
  on public.conference_windows (school_id, starts_on desc)
  where published = true;

create index if not exists conference_slots_window_idx
  on public.conference_slots (window_id, date, start_time);

create index if not exists conference_slots_teacher_idx
  on public.conference_slots (teacher_id, date);

create index if not exists conference_slots_booked_by_idx
  on public.conference_slots (booked_by)
  where booked_by is not null;
