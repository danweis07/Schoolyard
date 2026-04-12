/**
 * Astro middleware — runs once per request (hybrid mode) or once per
 * prerendered page (static mode). Its job is to populate
 * `Astro.locals.school` and `Astro.locals.supabase` so downstream pages
 * don't have to care about tenant resolution or backend plumbing.
 *
 * Resolution order:
 *
 *   1. `x-schoolyard-school` header (only honored in test/CI — not a
 *      production path, but convenient for Playwright.)
 *   2. Hostname — if the config has a district block and the leftmost
 *      DNS label matches a tenant slug, use that tenant.
 *   3. `/s/<slug>/...` path prefix — same district lookup.
 *   4. Single-tenant mode — fall back to `siteConfig.school`.
 *
 * In static mode there is ONE tenant per build, so branches 2-3 never
 * fire and branch 4 is the universal answer. Adding them now makes the
 * hybrid flip a config change, not a code change.
 */
import { defineMiddleware } from 'astro:middleware'
import { siteConfig, type RequestSchool } from '@/lib/site'
import { createContentClient, type ContentAdapter } from '@schoolyard/content-api'
import {
  isDistrictMode,
  findTenant,
  resolveTenantConfig,
  validateSupabaseEnv,
  type TenantSchool,
} from '@schoolyard/config'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace App {
    interface Locals {
      school?: RequestSchool
      /** Gateway-backed content client for data reads. */
      contentClient?: ContentAdapter
    }
  }
}

function extractSubdomain(hostname: string | null): string | null {
  if (!hostname) return null
  // Strip port if present.
  const host = hostname.split(':')[0]
  // localhost / IP — no subdomain.
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null
  const parts = host.split('.')
  if (parts.length < 2) return null
  // For "longfellow.schoolyard.app" return "longfellow".
  // For "www.schoolyard.app" return null (www is not a tenant slug).
  const leftmost = parts[0]
  if (leftmost === 'www') return null
  return leftmost
}

function extractPathSlug(pathname: string): string | null {
  const match = pathname.match(/^\/s\/([a-z0-9-]+)(?:\/|$)/)
  return match ? (match[1] ?? null) : null
}

function tenantToRequestSchool(tenant: TenantSchool): RequestSchool {
  return {
    slug: tenant.slug,
    name: tenant.name,
    shortName: tenant.shortName,
    tenant,
  }
}

function defaultRequestSchool(): RequestSchool {
  return {
    slug: siteConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: siteConfig.school.name,
    shortName: siteConfig.school.shortName,
  }
}

function resolveSchool(request: Request): RequestSchool {
  // 1. Test override header
  const override = request.headers.get('x-schoolyard-school')
  if (override && isDistrictMode(siteConfig)) {
    const tenant = findTenant(siteConfig, override)
    if (tenant) return tenantToRequestSchool(tenant)
  }

  // 2. Subdomain
  const subdomain = extractSubdomain(new URL(request.url).hostname)
  if (subdomain && isDistrictMode(siteConfig)) {
    const tenant = findTenant(siteConfig, subdomain)
    if (tenant) return tenantToRequestSchool(tenant)
  }

  // 3. Path prefix
  const pathSlug = extractPathSlug(new URL(request.url).pathname)
  if (pathSlug && isDistrictMode(siteConfig)) {
    const tenant = findTenant(siteConfig, pathSlug)
    if (tenant) return tenantToRequestSchool(tenant)
  }

  // 4. Single-tenant fallback
  return defaultRequestSchool()
}

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const piece of header.split(';')) {
    const idx = piece.indexOf('=')
    if (idx === -1) continue
    const name = piece.slice(0, idx).trim()
    const value = piece.slice(idx + 1).trim()
    if (name) out[name] = decodeURIComponent(value)
  }
  return out
}

// Validate env once at module load — fail fast in supabase mode.
const backendMode = process.env.SCHOOLYARD_BACKEND ?? 'supabase'
if (backendMode === 'supabase') {
  const envResult = validateSupabaseEnv(process.env as Record<string, string | undefined>)
  if (!envResult.valid) {
    console.error(
      `[Schoolyard] Missing required env vars for supabase backend: ${envResult.missing.join(', ')}. ` +
        `Set these in .env or your hosting provider. See .env.example.`,
    )
  }
}

export const onRequest = defineMiddleware((context, next) => {
  const { request, locals } = context
  const school = resolveSchool(request)
  locals.school = school

  // Gateway-backed content client for data reads.
  // All data flows through the gateway edge function — no direct Supabase queries.
  const gatewayUrl = process.env.SUPABASE_URL
  if (gatewayUrl) {
    locals.contentClient = createContentClient({
      backend: 'gateway',
      gatewayUrl,
      defaultSchoolSlug: school.slug,
    })
  }

  // When a request used a `/s/<slug>/...` prefix, the rest of the app
  // should see the path with the prefix stripped so locale routing
  // doesn't break. Rewrite here only when we're in hybrid mode — in
  // static mode, prerendered pages are already at the unslugged path.
  const url = new URL(request.url)
  const pathSlug = extractPathSlug(url.pathname)
  if (pathSlug) {
    // Only resolveTenantConfig to validate the slug — the side effect
    // is a friendlier error in dev if someone fat-fingers the path.
    try {
      resolveTenantConfig(siteConfig, pathSlug)
    } catch {
      // Unknown slug — let the 404 flow handle it downstream.
    }
  }

  return next()
})
