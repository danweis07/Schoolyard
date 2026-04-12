-- ============================================================
-- 0009_calendar_enhancements.sql — Grade/classroom targeting
--   and personal calendar view for events
-- ============================================================

-- ── Add targeting columns to events ──────────────────────────

alter table public.events
  add column if not exists target_grades text[] not null default '{}',
  add column if not exists target_classrooms text[] not null default '{}';

-- ── View: My RSVP'd events (personal calendar) ──────────────

create or replace view public.my_rsvp_events as
  select
    e.id,
    e.school_id,
    e.slug,
    e.title,
    e.description,
    e.body_html,
    e.starts_at,
    e.ends_at,
    e.location,
    e.category,
    e.capacity,
    e.rsvp_enabled,
    e.featured,
    e.cancelled,
    e.target_grades,
    e.target_classrooms,
    r.status   as rsvp_status,
    r.guests   as rsvp_guests
  from public.events e
  join public.event_rsvps r on r.event_id = e.id
 where r.user_id = auth.uid()
   and e.published = true;

grant select on public.my_rsvp_events to authenticated;

-- ── Index for grade filtering ────────────────────────────────

create index if not exists events_school_grades_idx
  on public.events using gin (target_grades)
  where published = true;
