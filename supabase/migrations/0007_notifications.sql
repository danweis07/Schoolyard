-- 0007_notifications.sql
-- Multi-channel notification system: tables for notifications, inbox,
-- delivery tracking, audience segments, contacts, templates, and audit.

-- ── Profile extensions ─────────────────────────────────────────
-- Grade cohort + phone for SMS fallback targeting.
alter table public.profiles
  add column if not exists grade text,
  add column if not exists phone text;

-- ── notification_contacts ──────────────────────────────────────
-- Phone-only parents who never install the app. "No-account SMS"
-- requirement — parents receive texts with only a phone number on file.
create table if not exists public.notification_contacts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  phone text not null,
  name text,
  email text,
  locale text not null default 'en',
  verified boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, phone)
);

comment on table public.notification_contacts is
  'Phone-only parents (no app, no account). Receive SMS notifications.';

-- ── notification_preferences ───────────────────────────────────
-- Per-parent channel + topic preferences. Exactly one of user_id or
-- contact_id must be set (app user vs phone-only parent).
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  contact_id uuid references public.notification_contacts(id) on delete cascade,
  channel_push boolean not null default true,
  channel_email boolean not null default true,
  channel_sms boolean not null default false,
  topics jsonb not null default '[]'::jsonb,
  cascade_order text[] not null default '{push,email,sms}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or contact_id is not null),
  unique (school_id, user_id),
  unique (school_id, contact_id)
);

comment on table public.notification_preferences is
  'Per-parent notification channel and topic preferences.';

-- ── notification_templates ─────────────────────────────────────
-- Pre-written template library: event cancelled, rain delay, volunteer
-- needed, etc. Created before notifications so notifications can FK to it.
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  body_text text not null,
  body_html text,
  urgency text not null default 'routine' check (urgency in ('routine', 'urgent')),
  topic text,
  locale_versions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

comment on table public.notification_templates is
  'Pre-written notification templates: event cancelled, rain delay, etc.';

-- ── notifications ──────────────────────────────────────────────
-- The rich message record. Replaces the simple `announcements` table
-- for new sends. Supports scheduling, audience segments, translations,
-- and OneSignal tracking.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  body_text text not null,
  body_html text,
  image_url text,
  urgency text not null default 'routine' check (urgency in ('routine', 'urgent')),
  topic text,
  segment_type text check (segment_type in ('all', 'grade', 'volunteer_group', 'event_rsvp', 'custom_tag')),
  segment_value text,
  template_id uuid references public.notification_templates(id) on delete set null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null references auth.users(id),
  onesignal_notification_id text,
  locale_versions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notifications is
  'Rich notification messages with audience targeting, scheduling, and multi-channel delivery.';

-- ── notification_deliveries ────────────────────────────────────
-- Per-recipient, per-channel delivery receipts. Populated by the
-- notify handler via service role after dispatching to OneSignal/Expo.
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  contact_id uuid references public.notification_contacts(id) on delete set null,
  channel text not null check (channel in ('push', 'email', 'sms')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  onesignal_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error_detail text,
  created_at timestamptz not null default now()
);

comment on table public.notification_deliveries is
  'Per-recipient delivery receipts by channel (push/email/SMS).';

-- ── notification_inbox ─────────────────────────────────────────
-- In-app inbox per user. One row per (notification, user) pair.
-- Supports read state, pinning, and archiving.
create table if not exists public.notification_inbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read boolean not null default false,
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

comment on table public.notification_inbox is
  'In-app notification inbox with read/pin/archive state per user.';

-- ── notification_audit_log ─────────────────────────────────────
-- Timestamped audit trail: who sent what, when, delivery stats.
create table if not exists public.notification_audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.notification_audit_log is
  'Audit log: who sent what notification, when, with what delivery stats.';

-- ── audience_segments ──────────────────────────────────────────
-- Community-defined audience segments for targeted notifications.
create table if not exists public.audience_segments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  segment_type text not null check (segment_type in ('grade', 'volunteer_group', 'event_rsvp', 'custom_tag')),
  segment_value text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

comment on table public.audience_segments is
  'Community-defined audience segments: grade cohort, volunteer group, RSVP list, custom tag.';

-- ── audience_segment_members ───────────────────────────────────
-- Manual members of custom-tag segments. Grade and volunteer_group
-- segments resolve dynamically from profiles and volunteer_hours.
create table if not exists public.audience_segment_members (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.audience_segments(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  contact_id uuid references public.notification_contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id is not null or contact_id is not null)
);

comment on table public.audience_segment_members is
  'Members of custom-tag audience segments.';

-- ── send_permissions ───────────────────────────────────────────
-- Role-based send scoping. PTA chair can send school-wide; grade rep
-- can only send to their grade.
create table if not exists public.send_permissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('school', 'grade', 'segment')),
  scope_value text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, scope, scope_value)
);

comment on table public.send_permissions is
  'Role-based notification send permissions: school-wide, grade-scoped, or segment-scoped.';

-- ── notification_replies ───────────────────────────────────────
-- SMS reply tracking for one-tap status checks ("is your family safe?").
create table if not exists public.notification_replies (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  phone text,
  user_id uuid references auth.users(id) on delete set null,
  reply_text text not null,
  created_at timestamptz not null default now()
);

comment on table public.notification_replies is
  'Inbound SMS replies to notifications for live tally and status checks.';
