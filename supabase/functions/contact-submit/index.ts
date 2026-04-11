/**
 * contact-submit edge function
 *
 * Accepts a contact-form submission, rejects bots via the honeypot
 * field, rate-limits by IP hash, and persists to `contact_submissions`
 * via the service-role client (RLS allows anon insert anyway, but this
 * path also runs the email hook). On success returns 204 so the
 * progressive-enhancement HTML form can redirect with a success query
 * param.
 *
 * Deploy: supabase functions deploy contact-submit
 * Secrets:
 *   SUPABASE_SERVICE_ROLE_KEY   (auto-injected)
 *   RESEND_API_KEY              (optional — enables email notifications)
 *   RESEND_FROM_EMAIL           (optional)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ContactPayload {
  school_slug: string
  name: string
  email: string
  subject?: string
  message: string
  honeypot?: string
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (Deno.env.get('IP_HASH_SALT') ?? 'sy-salt'))
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sendEmail(subject: string, body: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  const to = Deno.env.get('CONTACT_NOTIFY_EMAIL')
  if (!apiKey || !from || !to) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text: body }),
  })
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders(origin) })
  }

  let payload: ContactPayload
  try {
    payload = (await req.json()) as ContactPayload
  } catch {
    return new Response('invalid json', { status: 400, headers: corsHeaders(origin) })
  }

  // Honeypot — bots fill the hidden field.
  if (payload.honeypot && payload.honeypot.length > 0) {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  // Basic validation.
  if (!payload.school_slug || !payload.name || !payload.email || !payload.message) {
    return new Response('missing fields', { status: 400, headers: corsHeaders(origin) })
  }
  if (!payload.email.includes('@')) {
    return new Response('invalid email', { status: 400, headers: corsHeaders(origin) })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // Look up school by slug — we need the UUID for the insert.
  const { data: school, error: schoolErr } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', payload.school_slug)
    .maybeSingle()
  if (schoolErr) {
    return new Response(`school lookup failed: ${schoolErr.message}`, {
      status: 500,
      headers: corsHeaders(origin),
    })
  }
  if (!school) {
    return new Response('unknown school', { status: 404, headers: corsHeaders(origin) })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = await hashIp(ip)

  // Rate limit: one submission per IP per 60s.
  const { count } = await supabase
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())
  if (typeof count === 'number' && count > 0) {
    return new Response('rate limited', { status: 429, headers: corsHeaders(origin) })
  }

  const { error } = await supabase.from('contact_submissions').insert({
    school_id: school.id,
    name: payload.name,
    email: payload.email,
    subject: payload.subject ?? null,
    message: payload.message,
    ip_hash: ipHash,
  })
  if (error) {
    return new Response(`insert failed: ${error.message}`, {
      status: 500,
      headers: corsHeaders(origin),
    })
  }

  // Fire-and-forget email notification.
  sendEmail(
    `[Schoolyard] New contact form submission from ${payload.name}`,
    `${payload.message}\n\n— ${payload.name} <${payload.email}>`,
  ).catch(() => {})

  return new Response(null, { status: 204, headers: corsHeaders(origin) })
})
