/**
 * export-spirit-orders edge function
 *
 * Domain operation: "An admin exports all spirit store orders as CSV for the printer."
 *
 * - Auth required + admin role check
 * - Queries all orders + lines for the school, joins product names
 * - Returns text/csv with fulfillment-ready columns
 * - Filterable by status query param (e.g., ?status=paid)
 *
 * GET /export-spirit-orders?school_slug=longfellow&status=paid
 * Authorization: Bearer <token>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function cors(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) })
  }
  if (req.method !== 'GET') {
    return new Response('method not allowed', { status: 405, headers: cors(origin) })
  }

  // Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response('unauthorized', { status: 401, headers: cors(origin) })
  }

  const url = new URL(req.url)
  const schoolSlug = url.searchParams.get('school_slug')
  const statusFilter = url.searchParams.get('status')

  if (!schoolSlug) {
    return new Response('school_slug query param required', { status: 400, headers: cors(origin) })
  }

  // Service-role client for data queries
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Verify user auth + admin role
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
    .eq('slug', schoolSlug)
    .maybeSingle()
  if (!school) {
    return new Response('unknown school', { status: 404, headers: cors(origin) })
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin =
    profile &&
    ['admin', 'district_admin'].includes(profile.role as string) &&
    profile.school_id === school.id
  if (!isAdmin) {
    return new Response('forbidden — admin role required', { status: 403, headers: cors(origin) })
  }

  // Query orders
  let ordersQuery = supabase
    .from('spirit_store_orders')
    .select('id, customer_name, customer_email, total_cents, status, created_at, notes')
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })

  if (statusFilter) {
    ordersQuery = ordersQuery.eq('status', statusFilter)
  }

  const { data: orders, error: ordersErr } = await ordersQuery
  if (ordersErr) {
    return new Response(`query failed: ${ordersErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  if (!orders || orders.length === 0) {
    const header =
      'order_id,customer_name,customer_email,product_name,variant,quantity,unit_price,total,status,ordered_at\n'
    return new Response(header, {
      status: 200,
      headers: {
        ...cors(origin),
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="spirit-orders-${schoolSlug}.csv"`,
      },
    })
  }

  // Query order lines + product names for all orders
  const orderIds = orders.map((o) => o.id)
  const { data: lines, error: linesErr } = await supabase
    .from('spirit_store_order_lines')
    .select('order_id, product_id, variant_label, quantity, unit_price_cents')
    .in('order_id', orderIds)

  if (linesErr) {
    return new Response(`lines query failed: ${linesErr.message}`, {
      status: 500,
      headers: cors(origin),
    })
  }

  // Get product names
  const productIds = [...new Set((lines ?? []).map((l) => l.product_id))]
  const { data: products } = await supabase
    .from('spirit_store_products')
    .select('id, name')
    .in('id', productIds)

  const productNameMap = new Map((products ?? []).map((p) => [p.id, p.name]))
  const orderMap = new Map(orders.map((o) => [o.id, o]))

  // Build CSV
  const rows: string[] = [
    'order_id,customer_name,customer_email,product_name,variant,quantity,unit_price,total,status,ordered_at',
  ]

  for (const line of lines ?? []) {
    const order = orderMap.get(line.order_id)
    if (!order) continue
    const productName = productNameMap.get(line.product_id) ?? 'Unknown'
    const lineTotal = ((line.unit_price_cents * line.quantity) / 100).toFixed(2)
    rows.push(
      [
        line.order_id,
        escapeCsv(order.customer_name),
        escapeCsv(order.customer_email),
        escapeCsv(productName),
        escapeCsv(line.variant_label ?? ''),
        String(line.quantity),
        (line.unit_price_cents / 100).toFixed(2),
        lineTotal,
        order.status,
        order.created_at,
      ].join(','),
    )
  }

  return new Response(rows.join('\n'), {
    status: 200,
    headers: {
      ...cors(origin),
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="spirit-orders-${schoolSlug}.csv"`,
    },
  })
})
