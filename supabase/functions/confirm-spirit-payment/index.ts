/**
 * confirm-spirit-payment edge function
 *
 * Domain operation: "A payment provider confirms payment for a spirit store order."
 *
 * Handles Stripe webhook `payment_intent.succeeded` events scoped to
 * spirit store orders (identified by `metadata.order_type === 'spirit_store'`).
 *
 * - Verifies Stripe signature (HMAC-SHA256)
 * - Updates order status to 'paid'
 * - Sets payment_reference to the PaymentIntent ID
 *
 * Secret: STRIPE_SPIRIT_WEBHOOK_SECRET (or falls back to STRIPE_WEBHOOK_SECRET)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface StripePaymentIntent {
  id: string
  amount: number
  metadata: {
    school_id?: string
    order_id?: string
    order_type?: string
  }
}

async function verifySignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!sigHeader) return false

  const parts = sigHeader.split(',').reduce(
    (acc, part) => {
      const [key, val] = part.split('=')
      if (key === 't') acc.timestamp = val
      if (key === 'v1') acc.signatures.push(val)
      return acc
    },
    { timestamp: '', signatures: [] as string[] },
  )

  if (!parts.timestamp || parts.signatures.length === 0) return false

  const payload = `${parts.timestamp}.${rawBody}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return parts.signatures.some((sig) => sig === expected)
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const raw = await req.text()
  const secret =
    Deno.env.get('STRIPE_SPIRIT_WEBHOOK_SECRET') ?? Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) {
    return new Response('webhook secret not configured', { status: 500 })
  }

  const ok = await verifySignature(raw, req.headers.get('stripe-signature'), secret)
  if (!ok) {
    return new Response('invalid signature', { status: 400 })
  }

  const event = JSON.parse(raw) as {
    type: string
    data: { object: StripePaymentIntent }
  }

  if (event.type !== 'payment_intent.succeeded') {
    return new Response(null, { status: 204 })
  }

  const intent = event.data.object

  // Only process spirit store orders
  if (intent.metadata.order_type !== 'spirit_store') {
    return new Response(null, { status: 204 })
  }

  const orderId = intent.metadata.order_id
  if (!orderId) {
    return new Response('missing order_id in metadata', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { error } = await supabase
    .from('spirit_store_orders')
    .update({
      status: 'paid',
      payment_reference: intent.id,
    })
    .eq('id', orderId)

  if (error) {
    return new Response(`update failed: ${error.message}`, { status: 500 })
  }

  return new Response(null, { status: 204 })
})
