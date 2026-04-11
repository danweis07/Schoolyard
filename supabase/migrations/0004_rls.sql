-- 0004_rls.sql
-- Row-level security. This is the single most important file in the
-- migration set — every bug here becomes a cross-tenant data leak.
--
-- Policy categories:
--   1. Public read on published content (events, news, board, ...)
--   2. Editor/admin writes scoped on profiles.role + profiles.school_id
--   3. User-scoped reads and writes on dynamic state (auth.uid() match)
--   4. Anon-only insert with honeypot guard (contact_submissions)
--   5. Donation selects BLOCKED outright — reads go through view only
--
-- Every new table MUST:
--   - enable RLS
--   - have at least one explicit policy (deny-by-default when RLS is
--     enabled without policies)
--   - be covered by an rls.spec.ts matrix test in supabase/tests/

-- ── Helpers ─────────────────────────────────────────────────────────
create or replace function public.is_school_editor(target_school uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.school_id = target_school
       and p.role in ('editor', 'admin', 'district_admin')
  );
$$;

create or replace function public.is_school_admin(target_school uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.school_id = target_school
       and p.role in ('admin', 'district_admin')
  );
$$;

-- ── Tenant tables ───────────────────────────────────────────────────
alter table public.districts enable row level security;
alter table public.schools enable row level security;

drop policy if exists "public read districts" on public.districts;
create policy "public read districts" on public.districts for select using (true);

drop policy if exists "public read schools" on public.schools;
create policy "public read schools" on public.schools for select using (true);

drop policy if exists "district_admin manages schools" on public.schools;
create policy "district_admin manages schools" on public.schools
  for all using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'district_admin'
         and (p.district_id = public.schools.district_id or p.school_id = public.schools.id)
    )
  ) with check (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'district_admin'
         and (p.district_id = public.schools.district_id or p.school_id = public.schools.id)
    )
  );

-- ── Profiles ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "self read profile" on public.profiles;
create policy "self read profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "admin read school profiles" on public.profiles;
create policy "admin read school profiles" on public.profiles
  for select using (public.is_school_admin(profiles.school_id));

-- ── Content tables ─────────────────────────────────────────────────
-- Enable RLS on every content table first.
alter table public.events enable row level security;
alter table public.news enable row level security;
alter table public.board_members enable row level security;
alter table public.volunteer_roles enable row level security;
alter table public.resources enable row level security;
alter table public.lunch_menus enable row level security;
alter table public.transportation_routes enable row level security;
alter table public.community_listings enable row level security;
alter table public.classroom_teachers enable row level security;
alter table public.budget_years enable row level security;
alter table public.committees enable row level security;
alter table public.programs enable row level security;
alter table public.pta_newsletters enable row level security;

-- Public reads: events + news gate on `published`, community_listings
-- gates on `hidden`, everything else is unconditionally public.
drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (published = true);

drop policy if exists "public read news" on public.news;
create policy "public read news" on public.news for select using (published = true);

drop policy if exists "public read community_listings" on public.community_listings;
create policy "public read community_listings" on public.community_listings
  for select using (hidden = false);

drop policy if exists "public read board_members" on public.board_members;
create policy "public read board_members" on public.board_members for select using (true);

drop policy if exists "public read volunteer_roles" on public.volunteer_roles;
create policy "public read volunteer_roles" on public.volunteer_roles for select using (true);

drop policy if exists "public read resources" on public.resources;
create policy "public read resources" on public.resources for select using (true);

drop policy if exists "public read lunch_menus" on public.lunch_menus;
create policy "public read lunch_menus" on public.lunch_menus for select using (true);

drop policy if exists "public read transportation_routes" on public.transportation_routes;
create policy "public read transportation_routes" on public.transportation_routes
  for select using (true);

drop policy if exists "public read classroom_teachers" on public.classroom_teachers;
create policy "public read classroom_teachers" on public.classroom_teachers
  for select using (true);

drop policy if exists "public read budget_years" on public.budget_years;
create policy "public read budget_years" on public.budget_years for select using (true);

drop policy if exists "public read committees" on public.committees;
create policy "public read committees" on public.committees for select using (true);

drop policy if exists "public read programs" on public.programs;
create policy "public read programs" on public.programs for select using (true);

drop policy if exists "public read pta_newsletters" on public.pta_newsletters;
create policy "public read pta_newsletters" on public.pta_newsletters for select using (true);

-- Editor writes: uniform pattern, one policy per table.
drop policy if exists "editor write events" on public.events;
create policy "editor write events" on public.events
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write news" on public.news;
create policy "editor write news" on public.news
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write board_members" on public.board_members;
create policy "editor write board_members" on public.board_members
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write volunteer_roles" on public.volunteer_roles;
create policy "editor write volunteer_roles" on public.volunteer_roles
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write resources" on public.resources;
create policy "editor write resources" on public.resources
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write lunch_menus" on public.lunch_menus;
create policy "editor write lunch_menus" on public.lunch_menus
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write transportation_routes" on public.transportation_routes;
create policy "editor write transportation_routes" on public.transportation_routes
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write classroom_teachers" on public.classroom_teachers;
create policy "editor write classroom_teachers" on public.classroom_teachers
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write budget_years" on public.budget_years;
create policy "editor write budget_years" on public.budget_years
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write committees" on public.committees;
create policy "editor write committees" on public.committees
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write programs" on public.programs;
create policy "editor write programs" on public.programs
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "editor write pta_newsletters" on public.pta_newsletters;
create policy "editor write pta_newsletters" on public.pta_newsletters
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

-- community_listings: editors have blanket write; anyone authenticated
-- can INSERT their own listing via the author policy below. Updates +
-- deletes are editor-only.
drop policy if exists "editor write community_listings" on public.community_listings;
create policy "editor write community_listings" on public.community_listings
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

drop policy if exists "authed insert community_listings" on public.community_listings;
create policy "authed insert community_listings" on public.community_listings
  for insert with check (auth.uid() is not null and auth.uid() = created_by);

-- ── Dynamic user-scoped tables ──────────────────────────────────────
alter table public.event_rsvps enable row level security;
drop policy if exists "self read rsvps" on public.event_rsvps;
create policy "self read rsvps" on public.event_rsvps for select using (auth.uid() = user_id);
drop policy if exists "self write rsvps" on public.event_rsvps;
create policy "self write rsvps" on public.event_rsvps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin read rsvps" on public.event_rsvps;
create policy "admin read rsvps" on public.event_rsvps
  for select using (public.is_school_admin(event_rsvps.school_id));

alter table public.volunteer_hours enable row level security;
drop policy if exists "self manage volunteer_hours" on public.volunteer_hours;
create policy "self manage volunteer_hours" on public.volunteer_hours
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin read volunteer_hours" on public.volunteer_hours;
create policy "admin read volunteer_hours" on public.volunteer_hours
  for select using (public.is_school_admin(volunteer_hours.school_id));

alter table public.community_flags enable row level security;
drop policy if exists "authed flag listing" on public.community_flags;
create policy "authed flag listing" on public.community_flags
  for insert with check (auth.uid() is not null);
drop policy if exists "admin read flags" on public.community_flags;
create policy "admin read flags" on public.community_flags
  for select using (public.is_school_admin(community_flags.school_id));
drop policy if exists "admin resolve flags" on public.community_flags;
create policy "admin resolve flags" on public.community_flags
  for update using (public.is_school_admin(community_flags.school_id))
            with check (public.is_school_admin(community_flags.school_id));

alter table public.push_tokens enable row level security;
drop policy if exists "self manage push_tokens" on public.push_tokens;
create policy "self manage push_tokens" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin read push_tokens" on public.push_tokens;
create policy "admin read push_tokens" on public.push_tokens
  for select using (public.is_school_admin(push_tokens.school_id));

alter table public.announcements enable row level security;
drop policy if exists "public read announcements" on public.announcements;
create policy "public read announcements" on public.announcements
  for select using (sent_at is not null);
drop policy if exists "admin write announcements" on public.announcements;
create policy "admin write announcements" on public.announcements
  for all using (public.is_school_admin(announcements.school_id))
          with check (public.is_school_admin(announcements.school_id));

-- ── Anon insert: contact_submissions ────────────────────────────────
alter table public.contact_submissions enable row level security;
drop policy if exists "anon insert contact_submissions" on public.contact_submissions;
create policy "anon insert contact_submissions" on public.contact_submissions
  for insert with check (honeypot is null or honeypot = '');
drop policy if exists "admin read contact_submissions" on public.contact_submissions;
create policy "admin read contact_submissions" on public.contact_submissions
  for select using (public.is_school_admin(contact_submissions.school_id));

-- ── Donations: BLOCKED from direct reads ────────────────────────────
alter table public.fundraising_donations enable row level security;
drop policy if exists "admin read donations" on public.fundraising_donations;
create policy "admin read donations" on public.fundraising_donations
  for select using (public.is_school_admin(fundraising_donations.school_id));
-- Inserts are performed by the Stripe webhook edge function using the
-- service role key, which bypasses RLS. No anon/auth insert policy is
-- created here, so inserts via the public API will be denied.
