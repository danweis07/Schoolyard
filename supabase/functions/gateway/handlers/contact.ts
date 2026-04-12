/**
 * Contact handler — contact form submission (public, rate-limited).
 *
 * Ported from supabase/functions/contact-submit/.
 */

import type { GatewayContext } from '../types.ts'
import { noContent, jsonError } from '../response.ts'

interface ContactPayload {
  name: string
  email: string
  subject?: string
  message: string
  honeypot?: string
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

export async function handleContact(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, origin } = ctx

  let payload: ContactPayload
  try {
    payload = (await req.json()) as ContactPayload
  } catch {
    return jsonError(400, 'invalid json', origin)
  }

  // Honeypot
  if (payload.honeypot && payload.honeypot.length > 0) {
    return noContent(origin)
  }

  if (!payload.name || !payload.email || !payload.message) {
    return jsonError(400, 'missing fields', origin)
  }
  if (!payload.email.includes('@')) {
    return jsonError(400, 'invalid email', origin)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = await hashIp(ip)

  // Rate limit: one submission per IP per 60s
  const { count } = await supabase
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())
  if (typeof count === 'number' && count > 0) {
    return jsonError(429, 'rate limited', origin)
  }

  const { error } = await supabase.from('contact_submissions').insert({
    school_id: schoolId,
    name: payload.name,
    email: payload.email,
    subject: payload.subject ?? null,
    message: payload.message,
    ip_hash: ipHash,
  })
  if (error) {
    return jsonError(500, `insert failed: ${error.message}`, origin)
  }

  // Fire-and-forget email notification
  sendEmail(
    `[Schoolyard] New contact form submission from ${payload.name}`,
    `${payload.message}\n\n— ${payload.name} <${payload.email}>`,
  ).catch(() => {})

  return noContent(origin)
}
