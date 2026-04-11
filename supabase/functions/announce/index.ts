/**
 * announce edge function
 *
 * Admins POST { school_slug, title, body } to send a push notification
 * to every `push_tokens` row for the target school and record an
 * `announcements` entry. Only callable by admin/district_admin.
 *
 * Env:
 *   SUPABASE_URL + SERVICE_ROLE_KEY + ANON_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

function cors(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

interface AnnouncePayload {
  school_slug: string
  title: string
  body: string
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST')
    return new Response('method not allowed', { status: 405, headers: cors(origin) })

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return new Response('unauthorized', { status: 401, headers: cors(origin) })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    },
  )

  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser()
  if (authErr || !user) return new Response('unauthorized', { status: 401, headers: cors(origin) })

  const payload = (await req.json()) as AnnouncePayload
  if (!payload.school_slug || !payload.title || !payload.body) {
    return new Response('missing fields', { status: 400, headers: cors(origin) })
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', payload.school_slug)
    .maybeSingle()
  if (!school) return new Response('unknown school', { status: 404, headers: cors(origin) })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()
  const allowed =
    profile &&
    ['admin', 'district_admin'].includes(profile.role as string) &&
    profile.school_id === school.id
  if (!allowed) return new Response('forbidden', { status: 403, headers: cors(origin) })

  // Persist the announcement.
  const { error: insertErr } = await supabase.from('announcements').insert({
    school_id: school.id,
    title: payload.title,
    body: payload.body,
    sent_at: new Date().toISOString(),
    created_by: user.id,
  })
  if (insertErr) {
    return new Response(`insert failed: ${insertErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  // Fan out to push tokens.
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
    // Expo accepts up to 100 messages per request.
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100)
      await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      }).catch(() => {})
    }
  }

  return new Response(JSON.stringify({ sent: tokens?.length ?? 0 }), {
    status: 200,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  })
})
