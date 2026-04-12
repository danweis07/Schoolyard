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
  'content/manifest': { methods: ['GET'], auth: 'none' },
  'content/config': { methods: ['GET'], auth: 'none' },
  'content/events': { methods: ['GET'], auth: 'none' },
  'content/news': { methods: ['GET'], auth: 'none' },
  'content/board': { methods: ['GET'], auth: 'none' },
  'content/volunteers': { methods: ['GET'], auth: 'none' },
  'content/resources': { methods: ['GET'], auth: 'none' },
  'content/lunch-menus': { methods: ['GET'], auth: 'none' },
  'content/transportation': { methods: ['GET'], auth: 'none' },
  'content/community': { methods: ['GET'], auth: 'none' },
  'content/teachers': { methods: ['GET'], auth: 'none' },
  'content/budget': { methods: ['GET'], auth: 'none' },
  'content/committees': { methods: ['GET'], auth: 'none' },
  'content/programs': { methods: ['GET'], auth: 'none' },
  'content/newsletters': { methods: ['GET'], auth: 'none' },
  'content/announcements': { methods: ['GET'], auth: 'none' },
  'content/counts': { methods: ['GET'], auth: 'none' },
  'content/community-resources': { methods: ['GET'], auth: 'none' },
  'content/forms': { methods: ['GET'], auth: 'none' },
  'content/conferences': { methods: ['GET'], auth: 'none' },

  // ── Admin (authenticated CRUD) ─────────────────────────────────
  'admin/profile': { methods: ['GET'], auth: 'member' },
  'admin/counts': { methods: ['GET'], auth: 'editor' },
  'admin/school': { methods: ['GET', 'PUT'], auth: 'admin' },

  // ── User actions ────────────────────────────────────────────────
  'user/rsvp': { methods: ['POST', 'DELETE'], auth: 'member' },
  'user/rsvps': { methods: ['GET'], auth: 'member' },
  'user/volunteer-hours': { methods: ['GET', 'POST'], auth: 'member' },
  'user/push-token': { methods: ['POST'], auth: 'member' },
  'user/flag-listing': { methods: ['POST'], auth: 'member' },
  'user/community-listing': { methods: ['POST'], auth: 'member' },

  // ── Forms (user actions) ────────────────────────────────────────
  'user/form-response':      { methods: ['POST'], auth: 'member' },
  'user/form-responses':     { methods: ['GET'], auth: 'member' },

  // ── Conferences (user actions) ──────────────────────────────────
  'user/book-conference':    { methods: ['POST'], auth: 'member' },
  'user/my-conferences':     { methods: ['GET'], auth: 'member' },

  // ── Calendar (user actions) ─────────────────────────────────────
  'user/my-rsvp-events':     { methods: ['GET'], auth: 'member' },

  // ── Fundraising ─────────────────────────────────────────────────
  'fundraising/donate': { methods: ['POST'], auth: 'none' },
  'fundraising/webhook': { methods: ['POST'], auth: 'stripe-sig' },

  // ── Contact ─────────────────────────────────────────────────────
  'contact/submit': { methods: ['POST'], auth: 'none' },

  // ── Announce (legacy, kept for backward compat) ─────────────────
  'announce':                { methods: ['POST'], auth: 'admin' },

  // ── Notify (multi-channel notification system) ─────────────────
  'notify':                           { methods: ['POST'], auth: 'admin' },
  'notify/history':                   { methods: ['GET'], auth: 'admin' },
  'notify/translate':                 { methods: ['POST'], auth: 'admin' },

  // ── Inbox (authenticated user inbox) ───────────────────────────
  'inbox':                            { methods: ['GET'], auth: 'member' },
  'inbox/unread-count':               { methods: ['GET'], auth: 'member' },

  // ── Notification preferences ───────────────────────────────────
  'notification-prefs':               { methods: ['GET', 'PUT'], auth: 'member' },

  // ── Audience segments ──────────────────────────────────────────
  'segments':                         { methods: ['GET', 'POST'], auth: 'editor' },

  // ── Notification contacts (phone-only parents) ─────────────────
  'notification-contacts':            { methods: ['GET', 'POST'], auth: 'admin' },

  // ── Notification templates ─────────────────────────────────────
  'notification-templates':           { methods: ['GET'], auth: 'none' },

  // ── Content: sent notifications (public read) ──────────────────
  'content/notifications':            { methods: ['GET'], auth: 'none' },

  // ── Webhooks (no auth — use shared secret) ─────────────────────
  'sms-reply':                        { methods: ['POST'], auth: 'none' },
  'alert-webhook':                    { methods: ['POST'], auth: 'none' },

  // ── Export ──────────────────────────────────────────────────────
  'export/volunteer-hours': { methods: ['POST'], auth: 'admin' },

  // ── Form admin ──────────────────────────────────────────────────
  'admin/form-reminder': { methods: ['POST'], auth: 'admin' },
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

  // content/conference-slots/{windowSlug}
  if (segments[0] === 'content' && segments[1] === 'conference-slots' && segments[2]) {
    if (method !== 'OPTIONS' && method !== 'GET') return null
    return { handler: 'content', resource: 'conference-slots', id: segments[2], auth: 'none' }
  }

  // user/cancel-conference/{slotId}
  if (segments[0] === 'user' && segments[1] === 'cancel-conference' && segments[2]) {
    if (method !== 'OPTIONS' && method !== 'DELETE') return null
    return { handler: 'user', resource: 'cancel-conference', id: segments[2], auth: 'member' }
  }

  // admin/form-responses/{formId}
  if (segments[0] === 'admin' && segments[1] === 'form-responses' && segments[2]) {
    if (method !== 'OPTIONS' && method !== 'GET') return null
    return { handler: 'admin', resource: 'form-responses', id: segments[2], auth: 'admin' }
  }

  // ── Notification system dynamic routes ──────────────────────────

  // notify/{id}, notify/{id}/resend, notify/{id}/cancel
  if (segments[0] === 'notify' && segments[1]) {
    if (method !== 'OPTIONS' && !['GET', 'POST'].includes(method)) return null
    return { handler: 'notify', resource: segments[1], id: segments[1], auth: 'admin' }
  }

  // inbox/{id} — update read/pin/archive
  if (segments[0] === 'inbox' && segments[1]) {
    if (method !== 'OPTIONS' && !['PUT'].includes(method)) return null
    return { handler: 'inbox', resource: 'inbox', id: segments[1], auth: 'member' }
  }

  // segments/{id}, segments/{id}/members, segments/{id}/members/{memberId}
  if (segments[0] === 'segments' && segments[1]) {
    const authLevel: AuthLevel = segments[2] === 'members' ? 'admin' : 'editor'
    return { handler: 'segments', resource: 'segments', id: segments[1], auth: authLevel }
  }

  // notification-contacts/{id}
  if (segments[0] === 'notification-contacts' && segments[1]) {
    if (method !== 'OPTIONS' && !['PUT', 'DELETE'].includes(method)) return null
    return { handler: 'notification-contacts', resource: 'notification-contacts', id: segments[1], auth: 'admin' }
  }

  // notification-templates/{id}
  if (segments[0] === 'notification-templates' && segments[1]) {
    return { handler: 'notification-templates', resource: 'notification-templates', id: segments[1], auth: segments.length === 2 && method === 'GET' ? 'none' : 'editor' as AuthLevel }
  }

  return null
}
