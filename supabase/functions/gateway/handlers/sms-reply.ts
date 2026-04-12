/**
 * SMS reply handler — inbound SMS webhook from OneSignal/Twilio.
 *
 * Matches phone number to a notification_contact or profile,
 * records the reply for live tally.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError } from '../response.ts'

interface SmsReplyPayload {
  /** Shared secret for webhook authentication */
  secret: string
  /** Phone number of the sender (E.164) */
  from: string
  /** The reply text */
  body: string
  /** The notification ID this is in reply to (if known) */
  notification_id?: string
  /** School slug for scoping */
  school_slug: string
}

export async function handleSmsReply(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, origin } = ctx

  if (req.method !== 'POST') return jsonError(405, 'method not allowed', origin)

  const payload = (await req.json()) as SmsReplyPayload

  // Validate shared secret
  const expectedSecret = Deno.env.get('SMS_REPLY_WEBHOOK_SECRET')
  if (expectedSecret && payload.secret !== expectedSecret) {
    return jsonError(403, 'invalid secret', origin)
  }

  if (!payload.from || !payload.body || !payload.school_slug) {
    return jsonError(400, 'from, body, and school_slug required', origin)
  }

  // Resolve school
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', payload.school_slug)
    .maybeSingle()

  if (!school) return jsonError(404, 'unknown school', origin)

  // Try to match phone to a contact or profile
  const { data: contact } = await supabase
    .from('notification_contacts')
    .select('id')
    .eq('school_id', school.id)
    .eq('phone', payload.from)
    .maybeSingle()

  let userId: string | null = null
  if (!contact) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', school.id)
      .eq('phone', payload.from)
      .maybeSingle()
    if (profile) userId = profile.id
  }

  // If we have a notification_id, record the reply
  const notificationId = payload.notification_id
  if (!notificationId) {
    // Try to find the most recent notification for this school
    const { data: recent } = await supabase
      .from('notifications')
      .select('id')
      .eq('school_id', school.id)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!recent) return jsonError(404, 'no recent notification found', origin)

    const { error } = await supabase.from('notification_replies').insert({
      notification_id: recent.id,
      school_id: school.id,
      phone: payload.from,
      user_id: userId,
      reply_text: payload.body,
    })

    if (error) return jsonError(500, error.message, origin)
    return jsonOk({ recorded: true }, origin)
  }

  const { error } = await supabase.from('notification_replies').insert({
    notification_id: notificationId,
    school_id: school.id,
    phone: payload.from,
    user_id: userId,
    reply_text: payload.body,
  })

  if (error) return jsonError(500, error.message, origin)
  return jsonOk({ recorded: true }, origin)
}
