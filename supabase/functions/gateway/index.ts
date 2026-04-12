/**
 * Gateway — single Supabase Edge Function entry point.
 *
 * All frontend data access routes through this function.
 * Auth is handled at the gateway level:
 *   - Public content reads pass through unauthenticated
 *   - Admin, user, and moderation routes require a Bearer token
 *   - Stripe webhooks use signature verification
 *
 * Flow: CORS → Route Match → Auth Decision → Handler Dispatch → Response
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { matchRoute } from './router.ts'
import { verifyAuth, satisfiesAuthLevel } from './auth.ts'
import { resolveSchool, getSchoolFromRequest } from './school.ts'
import { corsHeaders, jsonError, noContent } from './response.ts'
import type { GatewayContext } from './types.ts'

// ── Handler imports ──────────────────────────────────────────────
import { handleContent } from './handlers/content.ts'
import { handleAdmin } from './handlers/admin.ts'
import { handleUser } from './handlers/user.ts'
import { handleFundraising } from './handlers/fundraising.ts'
import { handleContact } from './handlers/contact.ts'
import { handleAnnounce } from './handlers/announce.ts'
import { handleExport } from './handlers/export.ts'

const HANDLER_MAP: Record<
  string,
  (ctx: GatewayContext) => Promise<Response>
> = {
  content: handleContent,
  admin: handleAdmin,
  user: handleUser,
  fundraising: handleFundraising,
  contact: handleContact,
  announce: handleAnnounce,
  export: handleExport,
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')

  // ── CORS preflight ─────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  // ── Route matching ─────────────────────────────────────────────
  const route = matchRoute(req)
  if (!route) {
    return jsonError(404, 'not found', origin)
  }

  // ── Auth decision ──────────────────────────────────────────────
  let auth = null
  if (route.auth !== 'none' && route.auth !== 'stripe-sig') {
    auth = await verifyAuth(req)
    if (!auth) {
      return jsonError(401, 'unauthorized', origin)
    }
  }

  // ── School resolution ──────────────────────────────────────────
  // Most routes require a school slug. Some (like admin/profile) don't.
  const schoolSlug = getSchoolFromRequest(req)
  let schoolId = ''

  const needsSchool =
    route.resource !== 'profile' &&
    route.handler !== 'announce' // announce gets school from payload

  if (needsSchool) {
    if (!schoolSlug) {
      return jsonError(400, 'missing school parameter', origin)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lookupClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
    const school = await resolveSchool(lookupClient, schoolSlug)
    if (!school) {
      return jsonError(404, 'unknown school', origin)
    }
    schoolId = school.id

    // Check role-based access against the resolved school
    if (!satisfiesAuthLevel(auth, route.auth, schoolId)) {
      return jsonError(403, 'forbidden', origin)
    }
  } else if (route.auth !== 'none' && route.auth !== 'stripe-sig') {
    // For routes that don't need a school (like /admin/profile),
    // auth is already verified above, just check basic auth level
    if (!auth) {
      return jsonError(401, 'unauthorized', origin)
    }
  }

  // ── Create service-role client for handler ─────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // ── Dispatch ───────────────────────────────────────────────────
  const handler = HANDLER_MAP[route.handler]
  if (!handler) {
    return jsonError(404, 'handler not found', origin)
  }

  const ctx: GatewayContext = {
    req,
    route,
    supabase,
    auth,
    schoolSlug: schoolSlug ?? '',
    schoolId,
    origin,
  }

  try {
    return await handler(ctx)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal error'
    console.error(`[gateway] ${route.handler}/${route.resource} error:`, err)
    return jsonError(500, message, origin)
  }
})
