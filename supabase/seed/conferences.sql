-- ============================================================
-- conferences.sql — Demo conference window + slots for Longfellow Elementary
-- ============================================================
-- Depends on: the demo school row in public.schools
-- Run AFTER the main seed.sql or as part of supabase db reset.
--
-- We use a CTE to look up the school_id by slug so these inserts
-- are portable across environments.

-- Stable UUIDs for seed data (generated once, never change)
-- conference_window:  b2c3d4e5-2222-4000-8000-000000000001
-- teacher Rodriguez:  b2c3d4e5-2222-4000-8000-000000000010
-- teacher Chen:       b2c3d4e5-2222-4000-8000-000000000020
-- teacher Johnson:    b2c3d4e5-2222-4000-8000-000000000030
-- slots:              b2c3d4e5-2222-4000-8000-0000000001xx

-- ── Conference Window ───────────────────────────────────────────

with school as (
  select id from public.schools where slug = 'longfellow' limit 1
)
insert into public.conference_windows (id, school_id, slug, title, description, starts_on, ends_on, published, created_at, updated_at)
values (
  'b2c3d4e5-2222-4000-8000-000000000001',
  (select id from school),
  'fall-parent-teacher-conferences',
  'Fall Parent-Teacher Conferences',
  'Schedule a 15-minute conference with your child''s teacher. Please sign up for one slot per teacher. If you need additional time, contact the teacher directly to arrange a separate meeting.',
  '2026-10-15',
  '2026-10-17',
  true,
  now(),
  now()
)
on conflict (school_id, slug) do nothing;

-- ── Conference Slots ────────────────────────────────────────────
-- Note: teacher_id uses generated UUIDs that don't reference real auth users.
-- In a live deployment these would reference actual teacher auth.users rows.
-- For seed/demo purposes we use placeholder UUIDs — the RLS policy on
-- conference_slots allows public read for published windows, so these
-- display correctly without requiring matching auth records.
--
-- If your Supabase instance enforces FK on teacher_id → auth.users(id),
-- you will need to create demo teacher users first. The inserts below
-- use gen_random_uuid() via a known stable UUID so the FK is skipped
-- in local dev (seed runs after migrations with FK deferral).

with school as (
  select id from public.schools where slug = 'longfellow' limit 1
)
insert into public.conference_slots
  (id, window_id, school_id, teacher_id, teacher_name, date, start_time, end_time, duration_minutes, location, created_at, updated_at)
values
  -- Ms. Rodriguez (3rd Grade) — Oct 15
  (
    'b2c3d4e5-2222-4000-8000-000000000101',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000010',
    'Ms. Rodriguez (3rd Grade)',
    '2026-10-15', '15:00', '15:15', 15, 'Room 103',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000102',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000010',
    'Ms. Rodriguez (3rd Grade)',
    '2026-10-15', '15:15', '15:30', 15, 'Room 103',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000103',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000010',
    'Ms. Rodriguez (3rd Grade)',
    '2026-10-15', '15:30', '15:45', 15, 'Room 103',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000104',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000010',
    'Ms. Rodriguez (3rd Grade)',
    '2026-10-15', '15:45', '16:00', 15, 'Room 103',
    now(), now()
  ),

  -- Mr. Chen (4th Grade) — Oct 16
  (
    'b2c3d4e5-2222-4000-8000-000000000201',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000020',
    'Mr. Chen (4th Grade)',
    '2026-10-16', '15:00', '15:15', 15, 'Room 104',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000202',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000020',
    'Mr. Chen (4th Grade)',
    '2026-10-16', '15:15', '15:30', 15, 'Room 104',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000203',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000020',
    'Mr. Chen (4th Grade)',
    '2026-10-16', '15:30', '15:45', 15, 'Room 104',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000204',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000020',
    'Mr. Chen (4th Grade)',
    '2026-10-16', '15:45', '16:00', 15, 'Room 104',
    now(), now()
  ),

  -- Ms. Johnson (5th Grade) — Oct 17
  (
    'b2c3d4e5-2222-4000-8000-000000000301',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000030',
    'Ms. Johnson (5th Grade)',
    '2026-10-17', '15:00', '15:15', 15, 'Room 105',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000302',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000030',
    'Ms. Johnson (5th Grade)',
    '2026-10-17', '15:15', '15:30', 15, 'Room 105',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000303',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000030',
    'Ms. Johnson (5th Grade)',
    '2026-10-17', '15:30', '15:45', 15, 'Room 105',
    now(), now()
  ),
  (
    'b2c3d4e5-2222-4000-8000-000000000304',
    'b2c3d4e5-2222-4000-8000-000000000001',
    (select id from school),
    'b2c3d4e5-2222-4000-8000-000000000030',
    'Ms. Johnson (5th Grade)',
    '2026-10-17', '15:45', '16:00', 15, 'Room 105',
    now(), now()
  )
on conflict (window_id, teacher_id, date, start_time) do nothing;
