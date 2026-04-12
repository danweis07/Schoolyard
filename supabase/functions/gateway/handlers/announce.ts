/**
 * Announce handler — push notifications (admin-only).
 *
 * Ported from supabase/functions/announce/.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError } from '../response.ts'
import { resolveSchool } from '../school.ts'

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

interface AnnouncePayload {
  school_slug: string
  title: string
  body: string
}

export async function handleAnnounce(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, origin } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  const payload = (await req.json()) as AnnouncePayload
  if (!payload.school_slug || !payload.title || !payload.body) {
    return jsonError(400, 'missing fields', origin)
  }

  const school = await resolveSchool(supabase, payload.school_slug)
  if (!school) return jsonError(404, 'unknown school', origin)

  // Check admin role for this school
  const allowed = ['admin', 'district_admin'].includes(auth.role) && auth.schoolId === school.id
  if (!allowed) return jsonError(403, 'forbidden', origin)

  // Persist the announcement
  const { error: insertErr } = await supabase.from('announcements').insert({
    school_id: school.id,
    title: payload.title,
    body: payload.body,
    sent_at: new Date().toISOString(),
    created_by: auth.userId,
  })
  if (insertErr) {
    return jsonError(500, `insert failed: ${insertErr.message}`, origin)
  }

  // Fan out to push tokens
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_token')
    .eq('school_id', school.id)

  if (tokens && tokens.length > 0) {
    const messages = tokens.map((t: { expo_token: string }) => ({
      to: t.expo_token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
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

  return jsonOk({ sent: tokens?.length ?? 0 }, origin)
}
