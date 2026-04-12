-- 0008_notification_rls.sql
-- Row-level security for the notification system tables.
-- Every table must: enable RLS, have explicit policies, be tested in rls.spec.ts.

-- ── Helper: is_notification_sender ─────────────────────────────
-- Returns true if the caller is an admin/district_admin for the target
-- school OR has been granted explicit send_permissions.
create or replace function public.is_notification_sender(target_school uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.school_id = target_school
       and p.role in ('admin', 'district_admin')
  ) or exists (
    select 1 from public.send_permissions sp
     where sp.user_id = auth.uid()
       and sp.school_id = target_school
  );
$$;

-- ── notification_contacts ──────────────────────────────────────
alter table public.notification_contacts enable row level security;

drop policy if exists "admin read notification_contacts" on public.notification_contacts;
create policy "admin read notification_contacts" on public.notification_contacts
  for select using (public.is_school_admin(school_id));

drop policy if exists "admin write notification_contacts" on public.notification_contacts;
create policy "admin write notification_contacts" on public.notification_contacts
  for all using (public.is_school_admin(school_id))
          with check (public.is_school_admin(school_id));

-- ── notification_preferences ───────────────────────────────────
alter table public.notification_preferences enable row level security;

drop policy if exists "self manage notification_preferences" on public.notification_preferences;
create policy "self manage notification_preferences" on public.notification_preferences
  for all using (auth.uid() = user_id)
          with check (auth.uid() = user_id);

drop policy if exists "admin read notification_preferences" on public.notification_preferences;
create policy "admin read notification_preferences" on public.notification_preferences
  for select using (public.is_school_admin(school_id));

-- ── notifications ──────────────────────────────────────────────
alter table public.notifications enable row level security;

drop policy if exists "public read sent notifications" on public.notifications;
create policy "public read sent notifications" on public.notifications
  for select using (sent_at is not null);

drop policy if exists "sender write notifications" on public.notifications;
create policy "sender write notifications" on public.notifications
  for all using (public.is_notification_sender(school_id))
          with check (public.is_notification_sender(school_id));

-- ── notification_deliveries ────────────────────────────────────
alter table public.notification_deliveries enable row level security;

drop policy if exists "admin read notification_deliveries" on public.notification_deliveries;
create policy "admin read notification_deliveries" on public.notification_deliveries
  for select using (public.is_school_admin(school_id));

drop policy if exists "self read notification_deliveries" on public.notification_deliveries;
create policy "self read notification_deliveries" on public.notification_deliveries
  for select using (auth.uid() = user_id);
-- Inserts via service role only (from notify handler). No public insert policy.

-- ── notification_templates ─────────────────────────────────────
alter table public.notification_templates enable row level security;

drop policy if exists "public read notification_templates" on public.notification_templates;
create policy "public read notification_templates" on public.notification_templates
  for select using (true);

drop policy if exists "editor write notification_templates" on public.notification_templates;
create policy "editor write notification_templates" on public.notification_templates
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

-- ── notification_inbox ─────────────────────────────────────────
alter table public.notification_inbox enable row level security;

drop policy if exists "self manage notification_inbox" on public.notification_inbox;
create policy "self manage notification_inbox" on public.notification_inbox
  for all using (auth.uid() = user_id)
          with check (auth.uid() = user_id);

-- ── notification_audit_log ─────────────────────────────────────
alter table public.notification_audit_log enable row level security;

drop policy if exists "admin read notification_audit_log" on public.notification_audit_log;
create policy "admin read notification_audit_log" on public.notification_audit_log
  for select using (public.is_school_admin(school_id));
-- Inserts via service role only. No public insert policy.

-- ── audience_segments ──────────────────────────────────────────
alter table public.audience_segments enable row level security;

drop policy if exists "public read audience_segments" on public.audience_segments;
create policy "public read audience_segments" on public.audience_segments
  for select using (true);

drop policy if exists "editor write audience_segments" on public.audience_segments;
create policy "editor write audience_segments" on public.audience_segments
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

-- ── audience_segment_members ───────────────────────────────────
alter table public.audience_segment_members enable row level security;

drop policy if exists "admin write audience_segment_members" on public.audience_segment_members;
create policy "admin write audience_segment_members" on public.audience_segment_members
  for all using (public.is_school_admin(school_id))
          with check (public.is_school_admin(school_id));

drop policy if exists "self read audience_segment_members" on public.audience_segment_members;
create policy "self read audience_segment_members" on public.audience_segment_members
  for select using (auth.uid() = user_id);

-- ── send_permissions ───────────────────────────────────────────
alter table public.send_permissions enable row level security;

drop policy if exists "admin manage send_permissions" on public.send_permissions;
create policy "admin manage send_permissions" on public.send_permissions
  for all using (public.is_school_admin(school_id))
          with check (public.is_school_admin(school_id));

drop policy if exists "self read send_permissions" on public.send_permissions;
create policy "self read send_permissions" on public.send_permissions
  for select using (auth.uid() = user_id);

-- ── notification_replies ───────────────────────────────────────
alter table public.notification_replies enable row level security;

drop policy if exists "admin read notification_replies" on public.notification_replies;
create policy "admin read notification_replies" on public.notification_replies
  for select using (public.is_school_admin(school_id));
-- Inserts via service role only (from sms-reply webhook). No public insert policy.
