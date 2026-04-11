/**
 * Tenant resolver — decides whether a config is running in single-school
 * mode or multi-school district mode, and how to compute the effective
 * config for a given school slug.
 *
 * This is the "easy backend" abstraction layer. Single-tenant users pay
 * zero cost — the district field is absent by default and all helpers
 * degrade to returning the root config unchanged.
 *
 * District users add a `district` block to `school.config.json` listing
 * their schools. Each school can override branding, languages, modules,
 * and contact fields — anything unset inherits from the district defaults.
 */

import type { SchoolConfig, TenantSchool, District } from './schema.js'

export function isDistrictMode(config: SchoolConfig): boolean {
  return config.district !== undefined && config.district.schools.length > 0
}

export function isSingleTenant(config: SchoolConfig): boolean {
  return !isDistrictMode(config)
}

/**
 * Returns the slugs of all active schools in a district config.
 * Empty array in single-tenant mode.
 */
export function getTenantSlugs(config: SchoolConfig): string[] {
  if (!isDistrictMode(config)) return []
  return config.district!.schools.filter((s) => s.active).map((s) => s.slug)
}

/**
 * Returns the raw district block, or throws if called on a
 * single-tenant config. Use `isDistrictMode()` first.
 */
export function getDistrict(config: SchoolConfig): District {
  if (!isDistrictMode(config)) {
    throw new Error('getDistrict() called on a single-tenant config')
  }
  return config.district!
}

/**
 * Finds a school in a district config by slug. Returns undefined if
 * the slug doesn't match any school.
 */
export function findTenant(config: SchoolConfig, slug: string): TenantSchool | undefined {
  if (!isDistrictMode(config)) return undefined
  return config.district!.schools.find((s) => s.slug === slug)
}

/**
 * Computes the effective school config for a specific tenant by merging
 * per-school overrides onto the district defaults.
 *
 * Behavior:
 * - Single-tenant config + any slug: returns the config unchanged.
 * - District config + valid slug: returns a merged config where
 *   branding/languages/modules fall back to root when not overridden,
 *   and school.name/shortName come from the tenant entry.
 * - District config + invalid slug: throws.
 *
 * The returned config has `district` stripped so downstream code
 * (the generator, the web app) can treat it as a regular single-tenant
 * config — this lets the same rendering pipeline handle both modes.
 */
export function resolveTenantConfig(config: SchoolConfig, slug: string): SchoolConfig {
  if (!isDistrictMode(config)) {
    return config
  }

  const tenant = findTenant(config, slug)
  if (!tenant) {
    throw new Error(
      `Unknown tenant slug "${slug}". Known slugs: ${getTenantSlugs(config).join(', ') || '(none)'}`,
    )
  }

  // Deep-ish clone so callers can mutate the returned config freely.
  const base: SchoolConfig = JSON.parse(JSON.stringify(config))

  // Tenant school identity overrides the root school fields.
  base.school = {
    ...base.school,
    name: tenant.name,
    shortName: tenant.shortName,
    address: tenant.address ?? base.school.address,
    phone: tenant.phone ?? base.school.phone,
    email: tenant.email ?? base.school.email,
    timezone: tenant.timezone ?? base.school.timezone,
  }

  // Branding — shallow merge (per-school overrides beat district).
  if (tenant.branding) {
    base.branding = { ...base.branding, ...tenant.branding }
  }

  // Languages — if the tenant overrides, use their supported list;
  // otherwise keep district defaults.
  if (tenant.languages) {
    base.languages = {
      default: tenant.languages.default ?? base.languages.default,
      supported: tenant.languages.supported ?? base.languages.supported,
    }
  }

  // Modules — per-school module overrides win. Unset modules inherit.
  if (tenant.modules) {
    base.modules = { ...base.modules, ...tenant.modules }
  }

  // The resolved config is conceptually single-tenant from here on.
  // Strip district so downstream code can't re-resolve by accident.
  delete (base as { district?: District }).district

  return base
}

/**
 * Returns the manifest-relative content path for a tenant — used by
 * the generator to find per-school Markdown directories.
 *
 * - Single-tenant: `content/<collection>`
 * - District: `content/schools/<slug>/<collection>`
 */
export function getTenantContentSubdir(config: SchoolConfig, slug: string): string {
  if (!isDistrictMode(config)) return ''
  return `schools/${slug}`
}
