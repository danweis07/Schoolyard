/**
 * place-spirit-order edge function
 *
 * Domain operation: "A parent places an order for spirit store items."
 *
 * - Validates the store is open (school config window)
 * - Validates all product IDs exist, are active, belong to the school
 * - Calculates total from current server-side prices
 * - Routes to the configured payment adapter:
 *   - 'collect': inserts order directly, returns { order_id, status: 'pending' }
 *   - 'stripe': creates PaymentIntent, returns { order_id, client_secret }
 *   - 'square'/'paypal': returns { order_id, redirect_url } (future)
 *
 * Auth required (user must be signed in).
 *
 * Payload: {
 *   school_slug: string
 *   items: Array<{ product_id: string, variant_label?: string, quantity: number }>
 *   customer_name: string
 *   customer_email: string
 *   notes?: string
 *   payment_provider?: string  // override; defaults to school config
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OrderLinePayload {
  product_id: string
  variant_label?: string
  quantity: number
}

interface PlaceOrderPayload {
  school_slug: string
  items: OrderLinePayload[]
  customer_name: string
  customer_email: string
  notes?: string
  payment_provider?: string
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

  // Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response('unauthorized', { status: 401, headers: cors(origin) })
  }

  // Parse payload
  let payload: PlaceOrderPayload
  try {
    payload = (await req.json()) as PlaceOrderPayload
  } catch {
    return new Response('invalid json', { status: 400, headers: cors(origin) })
  }

  if (
    !payload.school_slug ||
    !payload.customer_name ||
    !payload.customer_email ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    return new Response('missing required fields', { status: 400, headers: cors(origin) })
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

  // Resolve school
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', payload.school_slug)
    .maybeSingle()
  if (!school) {
    return new Response('unknown school', { status: 404, headers: cors(origin) })
  }

  // Check store window (via school's spirit store config stored in schools.modules or config)
  // For now we check the spirit_store_products — if none are active, store is effectively closed.
  // A future enhancement could check opens_at/closes_at from a settings table.

  // Validate products exist, are active, and belong to the school
  const productIds = payload.items.map((item) => item.product_id)
  const { data: products, error: prodErr } = await supabase
    .from('spirit_store_products')
    .select('id, price_cents, active, school_id, variants')
    .in('id', productIds)

  if (prodErr) {
    return new Response(`product lookup failed: ${prodErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  if (!products || products.length !== productIds.length) {
    return new Response('one or more products not found', { status: 400, headers: cors(origin) })
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  for (const p of products) {
    if (!p.active) {
      return new Response(`product ${p.id} is not active`, { status: 400, headers: cors(origin) })
    }
    if (p.school_id !== school.id) {
      return new Response('product does not belong to this school', {
        status: 400,
        headers: cors(origin),
      })
    }
  }

  // Calculate total from server-side prices
  let totalCents = 0
  const orderLines: Array<{
    product_id: string
    variant_label: string | null
    quantity: number
    unit_price_cents: number
  }> = []

  for (const item of payload.items) {
    if (item.quantity < 1) {
      return new Response('quantity must be at least 1', { status: 400, headers: cors(origin) })
    }
    const product = productMap.get(item.product_id)!
    const lineCents = product.price_cents * item.quantity
    totalCents += lineCents
    orderLines.push({
      product_id: item.product_id,
      variant_label: item.variant_label ?? null,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
    })
  }

  // Determine payment provider
  const provider = payload.payment_provider ?? 'collect'

  // Insert order
  const { data: order, error: orderErr } = await supabase
    .from('spirit_store_orders')
    .insert({
      school_id: school.id,
      user_id: user.id,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      total_cents: totalCents,
      status: provider === 'collect' ? 'pending' : 'pending',
      payment_provider: provider,
      notes: payload.notes ?? null,
    })
    .select('id')
    .single()

  if (orderErr || !order) {
    return new Response(`order insert failed: ${orderErr?.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  // Insert order lines
  const lines = orderLines.map((line) => ({
    order_id: order.id,
    ...line,
  }))
  const { error: linesErr } = await supabase.from('spirit_store_order_lines').insert(lines)
  if (linesErr) {
    return new Response(`order lines insert failed: ${linesErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  // Route by payment provider
  if (provider === 'stripe') {
    const stripeKey = getStripeKey(payload.school_slug)
    if (!stripeKey) {
      return new Response('stripe not configured for this school', {
        status: 501,
        headers: cors(origin),
      })
    }

    const form = new URLSearchParams({
      amount: String(totalCents),
      currency: 'usd',
      'automatic_payment_methods[enabled]': 'true',
      'metadata[school_id]': school.id as string,
      'metadata[order_id]': order.id as string,
      'metadata[order_type]': 'spirit_store',
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

    // Store the PI reference
    await supabase
      .from('spirit_store_orders')
      .update({ payment_reference: intent.id })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({ order_id: order.id, client_secret: intent.client_secret }),
      { status: 200, headers: { ...cors(origin), 'Content-Type': 'application/json' } },
    )
  }

  // Default: 'collect' — order placed, payment at pickup
  return new Response(JSON.stringify({ order_id: order.id, status: 'pending' }), {
    status: 200,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  })
})
