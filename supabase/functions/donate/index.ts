/**
 * donate edge function
 *
 * Creates a Stripe PaymentIntent for a school donation. The Stripe
 * webhook at `supabase/functions/stripe-webhook/` is what actually
 * inserts the row into `fundraising_donations` — this function only
 * starts the intent so the client can confirm it.
 *
 * Payload: { school_slug, amount_cents, program_slug?, donor_name?, donor_email? }
 *
 * Secrets:
 *   STRIPE_SECRET_KEY  (or per-school SY_STRIPE_SECRET_<SLUG>)
 *   SUPABASE_URL       (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DonatePayload {
  school_slug: string
  amount_cents: number
  program_slug?: string
  donor_name?: string
  donor_email?: string
}

function cors(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function getStripeKey(slug: string): string | null {
  const perSchool = Deno.env.get(`SY_STRIPE_SECRET_${slug.toUpperCase().replace(/-/g, '_')}`)
  return perSchool ?? Deno.env.get('STRIPE_SECRET_KEY') ?? null
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: cors(origin) })
  }

  let payload: DonatePayload
  try {
    payload = (await req.json()) as DonatePayload
  } catch {
    return new Response('invalid json', { status: 400, headers: cors(origin) })
  }

  if (
    !payload.school_slug ||
    typeof payload.amount_cents !== 'number' ||
    payload.amount_cents < 100
  ) {
    return new Response('invalid amount', { status: 400, headers: cors(origin) })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', payload.school_slug)
    .maybeSingle()
  if (!school) return new Response('unknown school', { status: 404, headers: cors(origin) })

  let programId: string | null = null
  if (payload.program_slug) {
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('school_id', school.id)
      .eq('slug', payload.program_slug)
      .maybeSingle()
    programId = program?.id ?? null
  }

  const stripeKey = getStripeKey(payload.school_slug)
  if (!stripeKey) {
    return new Response('stripe not configured for this school', {
      status: 501,
      headers: cors(origin),
    })
  }

  const form = new URLSearchParams({
    amount: String(payload.amount_cents),
    currency: 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[school_id]': school.id as string,
    'metadata[school_slug]': payload.school_slug,
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
    return new Response(`stripe error: ${text}`, { status: 502, headers: cors(origin) })
  }
  const intent = (await res.json()) as { client_secret: string; id: string }

  return new Response(
    JSON.stringify({ client_secret: intent.client_secret, intent_id: intent.id }),
    {
      status: 200,
      headers: { ...cors(origin), 'Content-Type': 'application/json' },
    },
  )
})
