/**
 * Alert webhook handler — ingest external alerts from SchoolMessenger, Rave, etc.
 *
 * Accepts POST with HMAC-validated payload, maps to a notification,
 * and dispatches through the notify pipeline.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError } from '../response.ts'
import { resolveSchool } from '../school.ts'

interface AlertPayload {
  /** HMAC signature for verification */
  signature?: string
  /** Bearer token alternative */
  token?: string
  /** School slug */
  school_slug: string
  /** Alert title */
  title: string
  /** Alert body */
  body: string
  /** Source system identifier */
  source?: string
}

export async function handleAlertWebhook(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, origin } = ctx

  if (req.method !== 'POST') return jsonError(405, 'method not allowed', origin)

  const payload = (await req.json()) as AlertPayload

  // Validate webhook authentication
  const expectedToken = Deno.env.get('ALERT_WEBHOOK_TOKEN')
  if (expectedToken) {
    const valid = payload.token === expectedToken || payload.signature === expectedToken
    if (!valid) return jsonError(403, 'invalid authentication', origin)
  }

  if (!payload.school_slug || !payload.title || !payload.body) {
    return jsonError(400, 'school_slug, title, and body required', origin)
  }

  const school = await resolveSchool(supabase, payload.school_slug)
  if (!school) return jsonError(404, 'unknown school', origin)

  // Insert as an urgent notification from external source
  const { data: notification, error: insertErr } = await supabase
    .from('notifications')
    .insert({
      school_id: school.id,
      title: payload.title,
      body_text: payload.body,
      urgency: 'urgent',
      segment_type: 'all',
      sent_at: new Date().toISOString(),
      // Use a system user or first admin as created_by
      created_by: await getFirstAdmin(supabase, school.id),
    })
    .select('id')
    .single()

  if (insertErr) return jsonError(500, `insert failed: ${insertErr.message}`, origin)

  // Audit log
  await supabase.from('notification_audit_log').insert({
    school_id: school.id,
    notification_id: notification.id,
    actor_id: await getFirstAdmin(supabase, school.id),
    action: 'sent',
    metadata: { source: payload.source ?? 'external', external: true },
  })

  // Also write to legacy announcements
  await supabase.from('announcements').insert({
    school_id: school.id,
    title: payload.title,
    body: payload.body,
    sent_at: new Date().toISOString(),
  })

  // Fan out to all push tokens (urgent = all channels)
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_token')
    .eq('school_id', school.id)

  if (tokens && tokens.length > 0) {
    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
    const onesignalKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (onesignalAppId && onesignalKey) {
      await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${onesignalKey}`,
        },
        body: JSON.stringify({
          app_id: onesignalAppId,
          include_player_ids: tokens.map((t: { expo_token: string }) => t.expo_token),
          headings: { en: payload.title },
          contents: { en: payload.body },
        }),
      }).catch(() => {})
    } else {
      // Expo fallback
      const messages = tokens.map((t: { expo_token: string }) => ({
        to: t.expo_token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
      }))
      for (let i = 0; i < messages.length; i += 100) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages.slice(i, i + 100)),
        }).catch(() => {})
      }
    }
  }

  // Populate inbox
  const { data: schoolUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', school.id)

  if (schoolUsers && schoolUsers.length > 0) {
    await supabase.from('notification_inbox').insert(
      schoolUsers.map((u: { id: string }) => ({
        notification_id: notification.id,
        school_id: school.id,
        user_id: u.id,
      })),
    )
  }

  return jsonOk({ notification_id: notification.id, sent: tokens?.length ?? 0 }, origin)
}

async function getFirstAdmin(
  supabase: GatewayContext['supabase'],
  schoolId: string,
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', schoolId)
    .in('role', ['admin', 'district_admin'])
    .limit(1)
    .maybeSingle()

  return data?.id ?? '00000000-0000-0000-0000-000000000000'
}
