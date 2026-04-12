/**
 * Fundraising handler — donate (public) + Stripe webhook (sig-verified).
 *
 * Ported from supabase/functions/donate/ and supabase/functions/stripe-webhook/.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError, noContent } from '../response.ts'

export async function handleFundraising(ctx: GatewayContext): Promise<Response> {
  const { route } = ctx

  switch (route.resource) {
    case 'donate':
      return handleDonate(ctx)
    case 'webhook':
      return handleStripeWebhook(ctx)
    default:
      return jsonError(404, `unknown fundraising resource: ${route.resource}`, ctx.origin)
  }
}

// ── Donate ───────────────────────────────────────────────────────

interface DonatePayload {
  school_slug: string
  amount_cents: number
  program_slug?: string
  donor_name?: string
  donor_email?: string
}

function getStripeKey(slug: string): string | null {
  const perSchool = Deno.env.get(`SY_STRIPE_SECRET_${slug.toUpperCase().replace(/-/g, '_')}`)
  return perSchool ?? Deno.env.get('STRIPE_SECRET_KEY') ?? null
}

async function handleDonate(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, schoolSlug, origin } = ctx

  let payload: DonatePayload
  try {
    payload = (await req.json()) as DonatePayload
  } catch {
    return jsonError(400, 'invalid json', origin)
  }

  if (typeof payload.amount_cents !== 'number' || payload.amount_cents < 100) {
    return jsonError(400, 'invalid amount', origin)
  }

  let programId: string | null = null
  if (payload.program_slug) {
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('school_id', schoolId)
      .eq('slug', payload.program_slug)
      .maybeSingle()
    programId = program?.id ?? null
  }

  const stripeKey = getStripeKey(schoolSlug)
  if (!stripeKey) {
    return jsonError(501, 'stripe not configured for this school', origin)
  }

  const form = new URLSearchParams({
    amount: String(payload.amount_cents),
    currency: 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[school_id]': schoolId,
    'metadata[school_slug]': schoolSlug,
    'metadata[program_id]': programId ?? '',
    'metadata[donor_name]': payload.donor_name ?? '',
    'metadata[donor_email]': payload.donor_email ?? '',
  })

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    return jsonError(502, `stripe error: ${text}`, origin)
  }

  const intent = (await res.json()) as { client_secret: string; id: string }
  return jsonOk({ client_secret: intent.client_secret, intent_id: intent.id }, origin)
}

// ── Stripe Webhook ───────────────────────────────────────────────

interface StripePaymentIntent {
  id: string
  amount: number
  metadata: {
    school_id?: string
    school_slug?: string
    program_id?: string
    donor_name?: string
    donor_email?: string
  }
}

async function verifySignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => kv.split('=') as [string, string]),
  )
  if (!parts.t || !parts.v1) return false
  const signedPayload = `${parts.t}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  if (expected.length !== parts.v1.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i)
  }
  return mismatch === 0
}

async function handleStripeWebhook(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, origin } = ctx

  const raw = await req.text()
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return jsonError(500, 'webhook secret not configured', origin)

  const ok = await verifySignature(raw, req.headers.get('stripe-signature'), secret)
  if (!ok) return jsonError(400, 'invalid signature', origin)

  const event = JSON.parse(raw) as {
    type: string
    data: { object: StripePaymentIntent }
  }

  if (event.type !== 'payment_intent.succeeded') {
    return noContent(origin)
  }

  const intent = event.data.object
  const schoolId = intent.metadata.school_id
  if (!schoolId) return jsonError(400, 'missing school_id metadata', origin)

  const { error } = await supabase.from('fundraising_donations').insert({
    school_id: schoolId,
    program_id: intent.metadata.program_id || null,
    amount_cents: intent.amount,
    donor_name: intent.metadata.donor_name || null,
    donor_email: intent.metadata.donor_email || null,
    stripe_payment_intent: intent.id,
  })

  if (error) {
    return jsonError(500, `insert failed: ${error.message}`, origin)
  }
  return noContent(origin)
}
