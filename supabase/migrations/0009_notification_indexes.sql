-- 0009_notification_indexes.sql
-- Performance indexes for the notification system.

-- Hot-path: list sent notifications for a school (admin dashboard, public feed)
create index if not exists notifications_school_sent_idx
  on public.notifications (school_id, sent_at desc)
  where sent_at is not null;

-- Scheduler: find pending scheduled sends
create index if not exists notifications_school_scheduled_idx
  on public.notifications (school_id, scheduled_for)
  where scheduled_for is not null and sent_at is null and cancelled_at is null;

-- Delivery lookups by notification
create index if not exists notification_deliveries_notification_idx
  on public.notification_deliveries (notification_id);

-- Delivery status filtering (resend-to-unreached queries)
create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries (notification_id, status);

-- Inbox: user's unarchived inbox sorted by recency
create index if not exists notification_inbox_user_idx
  on public.notification_inbox (user_id, school_id, archived, created_at desc);

-- Contacts: list all phone-only parents for a school
create index if not exists notification_contacts_school_idx
  on public.notification_contacts (school_id);

-- Segments: list segments for a school
create index if not exists audience_segments_school_idx
  on public.audience_segments (school_id);

-- Segment members: list members of a segment
create index if not exists audience_segment_members_segment_idx
  on public.audience_segment_members (segment_id);

-- Audit log: recent activity for a school
create index if not exists notification_audit_log_school_idx
  on public.notification_audit_log (school_id, created_at desc);

-- Replies: tally replies per notification
create index if not exists notification_replies_notification_idx
  on public.notification_replies (notification_id);

-- Send permissions: lookup by school + user
create index if not exists send_permissions_school_user_idx
  on public.send_permissions (school_id, user_id);

-- Templates: lookup by school
create index if not exists notification_templates_school_idx
  on public.notification_templates (school_id);
