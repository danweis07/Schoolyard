/**
 * place-spirit-order edge function
 *
 * Domain operation: "A parent places an order for spirit store items."
 *
 * Adapter-first: validates products and creates the order locally, then
 * delegates checkout to the configured store adapter (collect, stripe,
 * square, paypal, shopify, printful, external).
 *
 * Auth required (user must be signed in).
 *
 * Payload: {
 *   school_slug: string
 *   items: Array<{ product_id: string, variant_label?: string, quantity: number }>
 *   customer_name: string
 *   customer_email: string
 *   notes?: string
 *   success_url?: string
 *   cancel_url?: string
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveAdapter } from '../_shared/store-adapters/index.ts'

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
  success_url?: string
  cancel_url?: string
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

  // Resolve school + spirit store config
  const { data: school } = await supabase
    .from('schools')
    .select('id, slug, modules')
    .eq('slug', payload.school_slug)
    .maybeSingle()
  if (!school) {
    return new Response('unknown school', { status: 404, headers: cors(origin) })
  }

  // Read spirit store settings from the school config (stored as JSON in schools table
  // or derived from the school.config.json at deploy time). For now, we read the
  // provider from env or default to 'collect'.
  const providerEnv = Deno.env.get(
    `SY_STORE_PROVIDER_${payload.school_slug.toUpperCase().replace(/-/g, '_')}`,
  )
  const provider = (providerEnv ?? 'collect') as
    | 'collect'
    | 'stripe'
    | 'square'
    | 'paypal'
    | 'shopify'
    | 'printful'
    | 'external'

  // Validate products exist, are active, and belong to the school
  const productIds = payload.items.map((item) => item.product_id)
  const { data: products, error: prodErr } = await supabase
    .from('spirit_store_products')
    .select('id, slug, name, price_cents, active, school_id, variants')
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
  const checkoutItems: Array<{
    product_id: string
    product_name: string
    variant_label?: string
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
    checkoutItems.push({
      product_id: item.product_id,
      product_name: product.name,
      variant_label: item.variant_label ?? undefined,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
    })
  }

  // Insert order
  const { data: order, error: orderErr } = await supabase
    .from('spirit_store_orders')
    .insert({
      school_id: school.id,
      user_id: user.id,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      total_cents: totalCents,
      status: 'pending',
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
  const lines = orderLines.map((line) => ({ order_id: order.id, ...line }))
  const { error: linesErr } = await supabase.from('spirit_store_order_lines').insert(lines)
  if (linesErr) {
    return new Response(`order lines insert failed: ${linesErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  // ── Delegate to the store adapter ──────────────────────────────
  try {
    const adapter = resolveAdapter({
      provider,
      schoolSlug: payload.school_slug,
      externalUrl:
        Deno.env.get(
          `SY_STORE_EXTERNAL_URL_${payload.school_slug.toUpperCase().replace(/-/g, '_')}`,
        ) ?? '',
      squareLocationId:
        Deno.env.get(
          `SY_SQUARE_LOCATION_${payload.school_slug.toUpperCase().replace(/-/g, '_')}`,
        ) ?? '',
      shopifyDomain:
        Deno.env.get(`SY_SHOPIFY_DOMAIN_${payload.school_slug.toUpperCase().replace(/-/g, '_')}`) ??
        '',
      shopifyStorefrontToken:
        Deno.env.get(`SY_SHOPIFY_TOKEN_${payload.school_slug.toUpperCase().replace(/-/g, '_')}`) ??
        '',
      printfulStoreId:
        Deno.env.get(`SY_PRINTFUL_STORE_${payload.school_slug.toUpperCase().replace(/-/g, '_')}`) ??
        '',
    })

    const siteUrl = Deno.env.get('SITE_URL') ?? ''
    const result = await adapter.beginCheckout({
      school_slug: payload.school_slug,
      school_id: school.id,
      order_id: order.id,
      items: checkoutItems,
      total_cents: totalCents,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      success_url: payload.success_url ?? `${siteUrl}/store/confirmation?order=${order.id}`,
      cancel_url: payload.cancel_url ?? `${siteUrl}/store`,
    })

    // Store payment reference if the adapter returned one
    if (result.payment_reference) {
      await supabase
        .from('spirit_store_orders')
        .update({ payment_reference: result.payment_reference })
        .eq('id', order.id)
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        adapter: adapter.name,
        ...result,
      }),
      { status: 200, headers: { ...cors(origin), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'adapter error'
    return new Response(
      JSON.stringify({
        order_id: order.id,
        adapter: provider,
        error: message,
        // Order exists but checkout failed — admin can retry or use CSV export
      }),
      { status: 502, headers: { ...cors(origin), 'Content-Type': 'application/json' } },
    )
  }
})
