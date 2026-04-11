/**
 * stripe-webhook edge function
 *
 * Stripe POSTs events here after payment confirmation. On
 * `payment_intent.succeeded` we insert a `fundraising_donations` row —
 * triggers in `0006_functions.sql` then bump `programs.raised_cents`.
 *
 * Secrets:
 *   STRIPE_WEBHOOK_SECRET         (for signature verification)
 *   SUPABASE_URL + SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function verifySignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false
  // Stripe sig format: "t=1234,v1=abcd,v0=..."
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
  // Constant-time comparison.
  if (expected.length !== parts.v1.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i)
  }
  return mismatch === 0
}

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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const raw = await req.text()
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return new Response('webhook secret not configured', { status: 500 })

  const ok = await verifySignature(raw, req.headers.get('stripe-signature'), secret)
  if (!ok) return new Response('invalid signature', { status: 400 })

  const event = JSON.parse(raw) as {
    type: string
    data: { object: StripePaymentIntent }
  }

  if (event.type !== 'payment_intent.succeeded') {
    return new Response(null, { status: 204 })
  }

  const intent = event.data.object
  const schoolId = intent.metadata.school_id
  if (!schoolId) return new Response('missing school_id metadata', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { error } = await supabase.from('fundraising_donations').insert({
    school_id: schoolId,
    program_id: intent.metadata.program_id || null,
    amount_cents: intent.amount,
    donor_name: intent.metadata.donor_name || null,
    donor_email: intent.metadata.donor_email || null,
    stripe_payment_intent: intent.id,
  })

  if (error) {
    // Return 500 so Stripe retries.
    return new Response(`insert failed: ${error.message}`, { status: 500 })
  }
  return new Response(null, { status: 204 })
})
