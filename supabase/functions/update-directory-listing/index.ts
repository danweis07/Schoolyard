/**
 * update-directory-listing edge function
 *
 * Domain operation: "A parent creates or updates their family's directory entry."
 *
 * - Auth required
 * - Upserts on (school_id, user_id) — user can only touch their own entry
 * - Validates: family_name required, at least one of email/phone if visible
 * - Derives school_id from the user's profile (prevents cross-school insertion)
 * - Returns the upserted entry
 *
 * Payload: {
 *   family_name: string
 *   parent_names?: string[]
 *   student_grades?: string[]
 *   email?: string
 *   phone?: string
 *   neighborhood?: string
 *   notes?: string
 *   visible?: boolean
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DirectoryPayload {
  family_name: string
  parent_names?: string[]
  student_grades?: string[]
  email?: string
  phone?: string
  neighborhood?: string
  notes?: string
  visible?: boolean
}

function cors(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: cors(origin) })
  }

  // Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response('unauthorized', { status: 401, headers: cors(origin) })
  }

  // Parse payload
  let payload: DirectoryPayload
  try {
    payload = (await req.json()) as DirectoryPayload
  } catch {
    return new Response('invalid json', { status: 400, headers: cors(origin) })
  }

  if (!payload.family_name || payload.family_name.trim().length === 0) {
    return new Response('family_name is required', { status: 400, headers: cors(origin) })
  }

  const visible = payload.visible !== false // default to true

  // If visible, require at least one contact method
  if (visible && !payload.email && !payload.phone) {
    return new Response('at least one of email or phone is required when listing is visible', {
      status: 400,
      headers: cors(origin),
    })
  }

  // Service-role client for trusted writes
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // User-scoped client to verify auth
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
  if (authErr || !user) {
    return new Response('unauthorized', { status: 401, headers: cors(origin) })
  }

  // Derive school_id from user's profile (prevents cross-school insertion)
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.school_id) {
    return new Response('user has no school association', { status: 400, headers: cors(origin) })
  }

  // Upsert directory entry
  const { data: entry, error: upsertErr } = await supabase
    .from('directory_entries')
    .upsert(
      {
        school_id: profile.school_id,
        user_id: user.id,
        family_name: payload.family_name.trim(),
        parent_names: payload.parent_names ?? [],
        student_grades: payload.student_grades ?? [],
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        neighborhood: payload.neighborhood ?? null,
        notes: payload.notes ?? null,
        visible,
      },
      { onConflict: 'school_id,user_id' },
    )
    .select(
      'id, family_name, parent_names, student_grades, email, phone, neighborhood, notes, visible',
    )
    .single()

  if (upsertErr) {
    return new Response(`upsert failed: ${upsertErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  return new Response(JSON.stringify(entry), {
    status: 200,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  })
})
