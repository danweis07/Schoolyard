/**
 * Centralized site-wide config helpers — every page imports `siteConfig`
 * from here so there's exactly one place to read school.config.json from.
 *
 * Two resolution paths live side by side:
 *
 *   - `siteConfig` (legacy) — loaded ONCE at module-load time from the
 *     school.config.json file on disk. Suitable for static-mode builds
 *     where every page is prerendered for a single school.
 *
 *   - `resolveRequestSchool(locals)` (new) — returns the per-request
 *     school identity populated by `src/middleware.ts`. Suitable for
 *     hybrid-mode pages that need to know which tenant is being served.
 *     In static mode this just falls back to `siteConfig.school`.
 */
import { loadSchoolConfigSync } from '@schoolyard/config/loader'
import type { SchoolConfig, TenantSchool } from '@schoolyard/config'

export const siteConfig: SchoolConfig = loadSchoolConfigSync()

/**
 * The per-request school identity exposed on `Astro.locals`. Populated
 * by `src/middleware.ts` — callers should use `resolveRequestSchool()`
 * instead of touching `locals.school` directly, so the static-mode
 * fallback stays centralized.
 */
export interface RequestSchool {
  /** Stable slug — used to scope Supabase queries and look up branding. */
  slug: string
  /** Human-readable school name. */
  name: string
  /** Short name / mascot-friendly label used by the header. */
  shortName: string
  /** Resolved tenant row, when in district mode and the slug matched. */
  tenant?: TenantSchool
}

/**
 * Resolves the effective school for a given Astro request. In hybrid
 * mode, middleware has already set `locals.school`; in static mode this
 * falls back to the single-tenant `siteConfig.school`.
 *
 * Accepts any object that may carry an optional `school` field —
 * typically `Astro.locals`, whose shape is declared by middleware.
 * Always use this helper instead of `siteConfig.school` in new code so
 * that pages automatically pick up the correct tenant once hybrid mode
 * is turned on.
 */
export function resolveRequestSchool(locals?: { school?: RequestSchool }): RequestSchool {
  if (locals?.school) return locals.school
  return {
    slug: siteConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: siteConfig.school.name,
    shortName: siteConfig.school.shortName,
  }
}
