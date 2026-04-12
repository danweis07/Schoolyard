/**
 * Standard response helpers for the gateway.
 */

export function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-school-slug',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }
}

export function jsonOk(data: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export function jsonCreated(data: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export function noContent(origin: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

export function jsonError(status: number, message: string, origin: string | null): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export function csvResponse(
  body: string,
  filename: string,
  origin: string | null,
): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
