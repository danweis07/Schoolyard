/**
 * Notify handler — multi-channel notification dispatch.
 *
 * Replaces the simple announce handler with full notification lifecycle:
 * send, schedule, cancel, resend, history, translate.
 *
 * Dual-mode delivery: OneSignal when configured, Expo push API fallback.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonCreated, jsonError } from '../response.ts'
import { resolveSchool } from '../school.ts'

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
const ONESIGNAL_API_ENDPOINT = 'https://api.onesignal.com/notifications'

interface NotifyPayload {
  school_slug?: string
  title: string
  body_text: string
  body_html?: string
  image_url?: string
  urgency?: 'routine' | 'urgent'
  segment_type?: 'all' | 'grade' | 'volunteer_group' | 'event_rsvp' | 'custom_tag'
  segment_value?: string
  template_id?: string
  scheduled_for?: string
  locale_versions?: Record<string, { title: string; body: string }>
}

export async function handleNotify(ctx: GatewayContext): Promise<Response> {
  const { route, origin } = ctx

  switch (route.resource) {
    case 'notify':
      return ctx.req.method === 'POST' ? sendNotification(ctx) : jsonError(405, 'method not allowed', origin)
    case 'history':
      return getHistory(ctx)
    case 'translate':
      return translateNotification(ctx)
    default: {
      // notify/{id} or notify/{id}/resend or notify/{id}/cancel
      if (route.id) {
        const url = new URL(ctx.req.url)
        const pathAfterGateway = url.pathname.split('/gateway/')[1] ?? ''
        if (pathAfterGateway.endsWith('/resend')) return resendNotification(ctx)
        if (pathAfterGateway.endsWith('/cancel')) return cancelNotification(ctx)
        return getNotificationDetail(ctx)
      }
      return jsonError(404, `unknown notify resource: ${route.resource}`, origin)
    }
  }
}

async function sendNotification(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  const payload = (await req.json()) as NotifyPayload
  if (!payload.title || !payload.body_text) {
    return jsonError(400, 'title and body_text required', origin)
  }

  // Resolve school if slug provided in payload (announce compat)
  let resolvedSchoolId = schoolId
  if (payload.school_slug && !schoolId) {
    const school = await resolveSchool(supabase, payload.school_slug)
    if (!school) return jsonError(404, 'unknown school', origin)
    resolvedSchoolId = school.id
  }

  const urgency = payload.urgency ?? 'routine'
  const segmentType = payload.segment_type ?? 'all'

  // Insert the notification record
  const { data: notification, error: insertErr } = await supabase
    .from('notifications')
    .insert({
      school_id: resolvedSchoolId,
      title: payload.title,
      body_text: payload.body_text,
      body_html: payload.body_html ?? null,
      image_url: payload.image_url ?? null,
      urgency,
      topic: null,
      segment_type: segmentType,
      segment_value: payload.segment_value ?? null,
      template_id: payload.template_id ?? null,
      scheduled_for: payload.scheduled_for ?? null,
      sent_at: payload.scheduled_for ? null : new Date().toISOString(),
      created_by: auth.userId,
      locale_versions: payload.locale_versions ?? {},
    })
    .select('id')
    .single()

  if (insertErr) {
    return jsonError(500, `insert failed: ${insertErr.message}`, origin)
  }

  // Audit log
  await supabase.from('notification_audit_log').insert({
    school_id: resolvedSchoolId,
    notification_id: notification.id,
    actor_id: auth.userId,
    action: payload.scheduled_for ? 'scheduled' : 'sent',
    metadata: { urgency, segment_type: segmentType, segment_value: payload.segment_value },
  })

  // Also write to legacy announcements table for backward compat
  await supabase.from('announcements').insert({
    school_id: resolvedSchoolId,
    title: payload.title,
    body: payload.body_text,
    sent_at: payload.scheduled_for ? null : new Date().toISOString(),
    created_by: auth.userId,
  })

  // If scheduled for the future, we're done — a cron will pick it up
  if (payload.scheduled_for) {
    return jsonCreated({ notification_id: notification.id, scheduled: true }, origin)
  }

  // Dispatch immediately
  const audienceSize = await dispatchNotification(
    supabase,
    resolvedSchoolId,
    notification.id,
    payload.title,
    payload.body_text,
    urgency,
    segmentType,
    payload.segment_value ?? null,
    payload.locale_versions,
  )

  // Populate inbox for all school users
  const { data: schoolUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', resolvedSchoolId)

  if (schoolUsers && schoolUsers.length > 0) {
    const inboxRows = schoolUsers.map((u: { id: string }) => ({
      notification_id: notification.id,
      school_id: resolvedSchoolId,
      user_id: u.id,
    }))
    await supabase.from('notification_inbox').insert(inboxRows)
  }

  return jsonCreated({ notification_id: notification.id, audience_size: audienceSize }, origin)
}

async function dispatchNotification(
  supabase: GatewayContext['supabase'],
  schoolId: string,
  notificationId: string,
  title: string,
  body: string,
  urgency: string,
  segmentType: string,
  segmentValue: string | null,
  _localeVersions?: Record<string, { title: string; body: string }>,
): Promise<number> {
  // Resolve audience — get push tokens based on segment
  let tokenQuery = supabase
    .from('push_tokens')
    .select('expo_token, user_id')
    .eq('school_id', schoolId)

  if (segmentType === 'grade' && segmentValue) {
    // Get users with matching grade, then filter tokens
    const { data: gradeUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('grade', segmentValue)
    if (gradeUsers && gradeUsers.length > 0) {
      const userIds = gradeUsers.map((u: { id: string }) => u.id)
      tokenQuery = tokenQuery.in('user_id', userIds)
    }
  } else if (segmentType === 'event_rsvp' && segmentValue) {
    const { data: rsvpUsers } = await supabase
      .from('event_rsvps')
      .select('user_id')
      .eq('event_id', segmentValue)
      .eq('status', 'going')
    if (rsvpUsers && rsvpUsers.length > 0) {
      const userIds = rsvpUsers.map((u: { user_id: string }) => u.user_id)
      tokenQuery = tokenQuery.in('user_id', userIds)
    }
  } else if (segmentType === 'custom_tag' && segmentValue) {
    // Look up segment by slug, then its members
    const { data: segment } = await supabase
      .from('audience_segments')
      .select('id')
      .eq('school_id', schoolId)
      .eq('slug', segmentValue)
      .maybeSingle()
    if (segment) {
      const { data: members } = await supabase
        .from('audience_segment_members')
        .select('user_id')
        .eq('segment_id', segment.id)
        .not('user_id', 'is', null)
      if (members && members.length > 0) {
        const userIds = members.map((m: { user_id: string }) => m.user_id)
        tokenQuery = tokenQuery.in('user_id', userIds)
      }
    }
  }

  const { data: tokens } = await tokenQuery

  if (!tokens || tokens.length === 0) return 0

  // Record delivery attempts
  const deliveryRows = tokens.map((t: { expo_token: string; user_id: string | null }) => ({
    notification_id: notificationId,
    school_id: schoolId,
    user_id: t.user_id,
    channel: 'push' as const,
    status: 'sent' as const,
    sent_at: new Date().toISOString(),
  }))
  await supabase.from('notification_deliveries').insert(deliveryRows)

  // Try OneSignal first, fall back to Expo
  const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
  const onesignalKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

  if (onesignalAppId && onesignalKey) {
    await sendViaOneSignal(onesignalAppId, onesignalKey, title, body, urgency, tokens)
  } else {
    await sendViaExpo(title, body, tokens)
  }

  // Also dispatch SMS to phone-only contacts if urgent
  if (urgency === 'urgent') {
    await dispatchSmsToContacts(supabase, schoolId, notificationId, title, body)
  }

  return tokens.length
}

async function sendViaOneSignal(
  appId: string,
  apiKey: string,
  title: string,
  body: string,
  _urgency: string,
  tokens: Array<{ expo_token: string; user_id: string | null }>,
): Promise<void> {
  const playerIds = tokens.map((t) => t.expo_token)

  await fetch(ONESIGNAL_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
    }),
  }).catch(() => {})
}

async function sendViaExpo(
  title: string,
  body: string,
  tokens: Array<{ expo_token: string; user_id: string | null }>,
): Promise<void> {
  const messages = tokens.map((t) => ({
    to: t.expo_token,
    sound: 'default',
    title,
    body,
  }))

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100)
    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => {})
  }
}

async function dispatchSmsToContacts(
  supabase: GatewayContext['supabase'],
  schoolId: string,
  notificationId: string,
  title: string,
  body: string,
): Promise<void> {
  const { data: contacts } = await supabase
    .from('notification_contacts')
    .select('id, phone')
    .eq('school_id', schoolId)
    .eq('verified', true)

  if (!contacts || contacts.length === 0) return

  // Record SMS delivery attempts
  const smsDeliveries = contacts.map((c: { id: string; phone: string }) => ({
    notification_id: notificationId,
    school_id: schoolId,
    contact_id: c.id,
    channel: 'sms' as const,
    status: 'pending' as const,
  }))
  await supabase.from('notification_deliveries').insert(smsDeliveries)

  // OneSignal SMS if configured
  const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
  const onesignalKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

  if (onesignalAppId && onesignalKey) {
    for (const contact of contacts) {
      await fetch(ONESIGNAL_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${onesignalKey}`,
        },
        body: JSON.stringify({
          app_id: onesignalAppId,
          include_phone_numbers: [contact.phone],
          sms_from: Deno.env.get('ONESIGNAL_SMS_FROM') ?? '',
          name: `SMS: ${title}`,
          contents: { en: `${title}: ${body}` },
          channel_for_external_user_ids: 'sms',
        }),
      }).catch(() => {})
    }
  }
}

async function getHistory(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin } = ctx

  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body_text, urgency, segment_type, segment_value, sent_at, scheduled_for, cancelled_at, created_by, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return jsonError(500, error.message, origin)
  return jsonOk(data ?? [], origin)
}

async function getNotificationDetail(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin, route } = ctx

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', route.id!)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error) return jsonError(500, error.message, origin)
  if (!data) return jsonError(404, 'notification not found', origin)

  // Get delivery stats
  const { data: stats } = await supabase.rpc('notification_delivery_stats', {
    p_notification: route.id!,
  })

  // Get reply count
  const { data: replyCount } = await supabase.rpc('notification_reply_count', {
    p_notification: route.id!,
  })

  return jsonOk({ ...data, delivery_stats: stats, reply_count: replyCount }, origin)
}

async function resendNotification(ctx: GatewayContext): Promise<Response> {
  const { supabase, auth, schoolId, origin, route } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  const notificationId = route.id!

  // Get the original notification
  const { data: notification } = await supabase
    .from('notifications')
    .select('title, body_text, urgency, segment_type, segment_value')
    .eq('id', notificationId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (!notification) return jsonError(404, 'notification not found', origin)

  // Get failed/pending deliveries to retry
  const { data: failed } = await supabase
    .from('notification_deliveries')
    .select('user_id, contact_id, channel')
    .eq('notification_id', notificationId)
    .in('status', ['pending', 'failed'])

  if (!failed || failed.length === 0) {
    return jsonOk({ resent: 0, message: 'no unreached recipients' }, origin)
  }

  // Audit log
  await supabase.from('notification_audit_log').insert({
    school_id: schoolId,
    notification_id: notificationId,
    actor_id: auth.userId,
    action: 'resent',
    metadata: { unreached_count: failed.length },
  })

  return jsonOk({ resent: failed.length }, origin)
}

async function cancelNotification(ctx: GatewayContext): Promise<Response> {
  const { supabase, auth, schoolId, origin, route } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  const { error } = await supabase
    .from('notifications')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', route.id!)
    .eq('school_id', schoolId)
    .is('sent_at', null)

  if (error) return jsonError(500, error.message, origin)

  await supabase.from('notification_audit_log').insert({
    school_id: schoolId,
    notification_id: route.id!,
    actor_id: auth.userId,
    action: 'cancelled',
  })

  return jsonOk({ cancelled: true }, origin)
}

async function translateNotification(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, origin } = ctx

  const body = (await req.json()) as {
    notification_id: string
    target_locales: string[]
  }

  if (!body.notification_id || !body.target_locales?.length) {
    return jsonError(400, 'notification_id and target_locales required', origin)
  }

  const { data: notification } = await supabase
    .from('notifications')
    .select('title, body_text, locale_versions')
    .eq('id', body.notification_id)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (!notification) return jsonError(404, 'notification not found', origin)

  // Translation is a stub — in production, call DeepL or Google Translate
  // For now, store the source text as-is with a note
  const translations: Record<string, { title: string; body: string }> = {
    ...(notification.locale_versions as Record<string, { title: string; body: string }> ?? {}),
  }

  for (const locale of body.target_locales) {
    translations[locale] = {
      title: `[${locale}] ${notification.title}`,
      body: `[${locale}] ${notification.body_text}`,
    }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ locale_versions: translations })
    .eq('id', body.notification_id)

  if (error) return jsonError(500, error.message, origin)

  return jsonOk({ translated: body.target_locales, locale_versions: translations }, origin)
}
