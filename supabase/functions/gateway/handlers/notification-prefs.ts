/**
 * Notification preferences handler — per-parent channel + topic prefs.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError } from '../response.ts'

export async function handleNotificationPrefs(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('school_id', schoolId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (error) return jsonError(500, error.message, origin)

    // Return defaults if no prefs set yet
    if (!data) {
      return jsonOk({
        channel_push: true,
        channel_email: true,
        channel_sms: false,
        topics: [],
        cascade_order: ['push', 'email', 'sms'],
      }, origin)
    }

    return jsonOk(data, origin)
  }

  if (req.method === 'PUT') {
    const body = (await req.json()) as {
      channel_push?: boolean
      channel_email?: boolean
      channel_sms?: boolean
      topics?: string[]
      cascade_order?: string[]
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          school_id: schoolId,
          user_id: auth.userId,
          channel_push: body.channel_push ?? true,
          channel_email: body.channel_email ?? true,
          channel_sms: body.channel_sms ?? false,
          topics: body.topics ?? [],
          cascade_order: body.cascade_order ?? ['push', 'email', 'sms'],
        },
        { onConflict: 'school_id,user_id' },
      )
      .select('*')
      .single()

    if (error) return jsonError(500, error.message, origin)
    return jsonOk(data, origin)
  }

  return jsonError(405, 'method not allowed', origin)
}
