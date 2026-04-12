/**
 * Lightweight URL-based router for the gateway.
 *
 * Parses the request URL path (after /gateway/) into a RouteMatch
 * that includes handler name, resource, optional ID, and required auth level.
 */

import type { AuthLevel, RouteMatch } from './types.ts'

interface RouteDefinition {
  /** Glob-ish pattern segments after the handler prefix */
  methods: string[]
  auth: AuthLevel
}

/**
 * Route table. Keys are `HANDLER/RESOURCE` patterns.
 * The router strips the function prefix (e.g. /gateway/) then matches.
 */
const ROUTES: Record<string, RouteDefinition> = {
  // ── Content (public reads) ──────────────────────────────────────
  'content/manifest':        { methods: ['GET'], auth: 'none' },
  'content/config':          { methods: ['GET'], auth: 'none' },
  'content/events':          { methods: ['GET'], auth: 'none' },
  'content/news':            { methods: ['GET'], auth: 'none' },
  'content/board':           { methods: ['GET'], auth: 'none' },
  'content/volunteers':      { methods: ['GET'], auth: 'none' },
  'content/resources':       { methods: ['GET'], auth: 'none' },
  'content/lunch-menus':     { methods: ['GET'], auth: 'none' },
  'content/transportation':  { methods: ['GET'], auth: 'none' },
  'content/community':       { methods: ['GET'], auth: 'none' },
  'content/teachers':        { methods: ['GET'], auth: 'none' },
  'content/budget':          { methods: ['GET'], auth: 'none' },
  'content/committees':      { methods: ['GET'], auth: 'none' },
  'content/programs':        { methods: ['GET'], auth: 'none' },
  'content/newsletters':     { methods: ['GET'], auth: 'none' },
  'content/announcements':   { methods: ['GET'], auth: 'none' },
  'content/counts':          { methods: ['GET'], auth: 'none' },

  // ── Admin (authenticated CRUD) ─────────────────────────────────
  'admin/profile':           { methods: ['GET'], auth: 'member' },
  'admin/counts':            { methods: ['GET'], auth: 'editor' },

  // ── User actions ────────────────────────────────────────────────
  'user/rsvp':               { methods: ['POST', 'DELETE'], auth: 'member' },
  'user/rsvps':              { methods: ['GET'], auth: 'member' },
  'user/volunteer-hours':    { methods: ['GET', 'POST'], auth: 'member' },
  'user/push-token':         { methods: ['POST'], auth: 'member' },
  'user/flag-listing':       { methods: ['POST'], auth: 'member' },
  'user/community-listing':  { methods: ['POST'], auth: 'member' },

  // ── Fundraising ─────────────────────────────────────────────────
  'fundraising/donate':      { methods: ['POST'], auth: 'none' },
  'fundraising/webhook':     { methods: ['POST'], auth: 'stripe-sig' },

  // ── Contact ─────────────────────────────────────────────────────
  'contact/submit':          { methods: ['POST'], auth: 'none' },

  // ── Announce ────────────────────────────────────────────────────
  'announce':                { methods: ['POST'], auth: 'admin' },

  // ── Export ──────────────────────────────────────────────────────
  'export/volunteer-hours':  { methods: ['POST'], auth: 'admin' },
}

/**
 * Parse the request URL and match it against the route table.
 *
 * Supabase Edge Functions receive URLs like:
 *   https://<project>.supabase.co/functions/v1/gateway/content/events?school=longfellow
 *
 * We strip everything up to and including `/gateway/` and match the rest.
 */
export function matchRoute(req: Request): RouteMatch | null {
  const url = new URL(req.url)
  const method = req.method.toUpperCase()

  // Strip the function name prefix. The path after `/functions/v1/gateway/`
  // is what we route on.
  const fullPath = url.pathname
  const gatewayIdx = fullPath.indexOf('/gateway/')
  if (gatewayIdx === -1) return null
  const routePath = fullPath.slice(gatewayIdx + '/gateway/'.length).replace(/\/$/, '')

  // Try exact match first
  const exact = ROUTES[routePath]
  if (exact) {
    if (method !== 'OPTIONS' && !exact.methods.includes(method)) return null
    const parts = routePath.split('/')
    return {
      handler: parts[0],
      resource: parts.slice(1).join('/') || parts[0],
      auth: exact.auth,
    }
  }

  // Try matching admin/{table} and admin/{table}/{id} patterns
  const segments = routePath.split('/')
  if (segments[0] === 'admin' && segments.length >= 2) {
    const table = segments[1]
    const id = segments[2]

    // admin/{table}/{id}
    if (id) {
      const authLevel: AuthLevel = 'editor'
      if (method !== 'OPTIONS' && !['GET', 'PUT', 'DELETE'].includes(method)) return null
      return { handler: 'admin', resource: table, id, auth: authLevel }
    }

    // admin/{table} (list or create)
    if (method !== 'OPTIONS' && !['GET', 'POST'].includes(method)) return null
    return { handler: 'admin', resource: table, auth: 'editor' }
  }

  // Try matching user/rsvp/{id}
  if (segments[0] === 'user' && segments[1] === 'rsvp' && segments[2]) {
    return { handler: 'user', resource: 'rsvp', id: segments[2], auth: 'member' }
  }

  return null
}
