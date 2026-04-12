-- 0010_notification_functions.sql
-- Functions, triggers, and grants for the notification system.

-- ── Delivery stats aggregate ───────────────────────────────────
-- Returns a JSON summary of delivery outcomes for a notification.
create or replace function public.notification_delivery_stats(p_notification uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'total',          count(*),
    'push_sent',      count(*) filter (where channel = 'push' and status in ('sent', 'delivered')),
    'push_delivered',  count(*) filter (where channel = 'push' and status = 'delivered'),
    'email_sent',      count(*) filter (where channel = 'email' and status in ('sent', 'delivered')),
    'email_delivered', count(*) filter (where channel = 'email' and status = 'delivered'),
    'sms_sent',        count(*) filter (where channel = 'sms' and status in ('sent', 'delivered')),
    'sms_delivered',   count(*) filter (where channel = 'sms' and status = 'delivered'),
    'failed',          count(*) filter (where status = 'failed'),
    'bounced',         count(*) filter (where status = 'bounced')
  )
  from public.notification_deliveries
  where notification_id = p_notification;
$$;

grant execute on function public.notification_delivery_stats(uuid) to authenticated;

-- ── Reply count aggregate ──────────────────────────────────────
create or replace function public.notification_reply_count(p_notification uuid)
returns integer language sql stable as $$
  select count(*)::integer
  from public.notification_replies
  where notification_id = p_notification;
$$;

grant execute on function public.notification_reply_count(uuid) to authenticated;

-- ── Updated_at touch triggers ──────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all notification tables with updated_at
create trigger notification_contacts_touch_updated_at
  before update on public.notification_contacts
  for each row execute function public.touch_updated_at();

create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

create trigger notification_templates_touch_updated_at
  before update on public.notification_templates
  for each row execute function public.touch_updated_at();

create trigger notifications_touch_updated_at
  before update on public.notifications
  for each row execute function public.touch_updated_at();

create trigger audience_segments_touch_updated_at
  before update on public.audience_segments
  for each row execute function public.touch_updated_at();
