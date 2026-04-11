/**
 * volunteer-hours-export edge function
 *
 * Admins POST { school_slug, start, end } and receive a signed Supabase
 * Storage URL for a CSV export of volunteer hours. Requires the caller
 * to be authenticated AND have `role in ('admin','district_admin')`
 * for the target school.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function cors(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

interface ExportPayload {
  school_slug: string
  start?: string
  end?: string
}

function toCsv(
  rows: Array<{
    served_on: string
    hours: number
    notes: string | null
    role: string | null
    user: string
  }>,
): string {
  const header = ['date', 'hours', 'role', 'user', 'notes']
  const lines = [header.join(',')]
  for (const row of rows) {
    const cells = [
      row.served_on,
      row.hours.toString(),
      row.role ?? '',
      row.user,
      (row.notes ?? '').replace(/"/g, '""'),
    ]
    lines.push(cells.map((c) => `"${c}"`).join(','))
  }
  return lines.join('\n') + '\n'
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

  const payload = (await req.json()) as ExportPayload
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', payload.school_slug)
    .maybeSingle()
  if (!school) return new Response('unknown school', { status: 404, headers: cors(origin) })

  // Check role + school scope via profiles.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()
  const allowed =
    profile &&
    profile.role &&
    ['admin', 'district_admin'].includes(profile.role as string) &&
    profile.school_id === school.id
  if (!allowed) return new Response('forbidden', { status: 403, headers: cors(origin) })

  let query = supabase
    .from('volunteer_hours')
    .select('served_on, hours, notes, role_id, user_id, volunteer_roles(title)')
    .eq('school_id', school.id)
    .order('served_on', { ascending: false })
  if (payload.start) query = query.gte('served_on', payload.start)
  if (payload.end) query = query.lte('served_on', payload.end)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = (await query) as any
  if (error) return new Response(`query failed: ${error.message}`, { status: 500 })

  // Resolve user emails via admin API.
  const userIds = Array.from(new Set(rows.map((r: { user_id: string }) => r.user_id)))
  const userEmails = new Map<string, string>()
  for (const id of userIds) {
    const { data } = await supabase.auth.admin.getUserById(id as string)
    if (data.user?.email) userEmails.set(id as string, data.user.email)
  }

  const csv = toCsv(
    rows.map(
      (r: {
        served_on: string
        hours: number
        notes: string | null
        user_id: string
        volunteer_roles?: { title: string } | null
      }) => ({
        served_on: r.served_on,
        hours: r.hours,
        notes: r.notes,
        role: r.volunteer_roles?.title ?? null,
        user: userEmails.get(r.user_id) ?? r.user_id,
      }),
    ),
  )

  const filename = `volunteer-hours-${payload.school_slug}-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(csv, {
    status: 200,
    headers: {
      ...cors(origin),
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
