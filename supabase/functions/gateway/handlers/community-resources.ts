/**
 * Community Resources handler — domain-driven aggregation from 211.org,
 * USDA FNS, and HRSA public APIs.
 *
 * Each external source is a self-contained provider that maps its API
 * response into Schoolyard's domain type (`CommunityResource`). Consumers
 * only ever see normalized objects — external API details stay encapsulated.
 *
 * Route: GET /gateway/content/community-resources?school=...&zip=94112
 * Optional params: category, locale, sources (csv), radius
 */

import type { GatewayContext } from '../types.ts'
import { corsHeaders, jsonError } from '../response.ts'

// ── Domain types ─────────────────────────────────────────────────

type ResourceCategory = 'food' | 'health' | 'housing' | 'legal' | 'mental-health' | 'other'

interface CommunityResource {
  slug: string
  name: string
  description: string
  category: ResourceCategory
  address?: string
  phone?: string
  url?: string
  languages: string[]
  source: '211' | 'usda' | 'hrsa'
  externalUrl?: string
}

interface ProviderParams {
  zipCode: string
  radiusMiles: number
  category?: ResourceCategory
  locale?: string
}

interface ResourceProvider {
  name: '211' | 'usda' | 'hrsa'
  fetch(params: ProviderParams): Promise<CommunityResource[]>
}

// ── Validation helpers ───────────────────────────────────────────

const VALID_CATEGORIES: ResourceCategory[] = [
  'food', 'health', 'housing', 'legal', 'mental-health', 'other',
]

const VALID_SOURCES = ['211', 'usda', 'hrsa'] as const
type SourceName = (typeof VALID_SOURCES)[number]

function isValidSource(s: string): s is SourceName {
  return (VALID_SOURCES as readonly string[]).includes(s)
}

function isValidCategory(s: string): s is ResourceCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(s)
}

// ── Slug generation ──────────────────────────────────────────────

function makeSlug(source: string, id: string): string {
  const clean = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${source}-${clean}`
}

// ── 211 Provider ─────────────────────────────────────────────────

/**
 * 211.org AIRS taxonomy → Schoolyard category mapping.
 * AIRS codes are the standard used by United Way / 211 providers.
 */
const AIRS_TO_CATEGORY: Record<string, ResourceCategory> = {
  BD: 'food',
  BH: 'housing',
  LF: 'health',
  FT: 'legal',
  RF: 'mental-health',
  // Common sub-codes
  'BD-1800': 'food',       // Food pantries
  'BD-5000': 'food',       // Meals
  'BH-1800': 'housing',    // Emergency shelter
  'BH-3800': 'housing',    // Rental assistance
  'LF-4500': 'health',     // Primary care
  'FT-3200': 'legal',      // Legal aid
  'RP-1500': 'mental-health', // Counseling
}

function mapAirsCategory(taxonomyCodes: string[]): ResourceCategory {
  for (const code of taxonomyCodes) {
    // Try exact match first, then prefix (first 2 chars)
    if (AIRS_TO_CATEGORY[code]) return AIRS_TO_CATEGORY[code]
    const prefix = code.slice(0, 2)
    if (AIRS_TO_CATEGORY[prefix]) return AIRS_TO_CATEGORY[prefix]
  }
  return 'other'
}

const provider211: ResourceProvider = {
  name: '211',
  async fetch(params: ProviderParams): Promise<CommunityResource[]> {
    const apiKey = Deno.env.get('TWO_ONE_ONE_API_KEY')
    if (!apiKey) return []

    const searchUrl = new URL('https://api.211.org/search/v1/api/Search/Keyword')
    searchUrl.searchParams.set('Keyword', params.category ?? 'community services')
    searchUrl.searchParams.set('Location', params.zipCode)
    searchUrl.searchParams.set('Distance', String(params.radiusMiles))
    searchUrl.searchParams.set('Top', '25')
    if (params.locale && params.locale !== 'en') {
      searchUrl.searchParams.set('Language', params.locale)
    }

    const res = await fetch(searchUrl.toString(), {
      headers: {
        'Api-Key': apiKey,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`211 API returned ${res.status}: ${await res.text()}`)
    }

    const data = await res.json()
    const results: unknown[] = Array.isArray(data) ? data : (data?.results ?? data?.Results ?? [])

    return results.map((item: Record<string, unknown>) => {
      const id = String(item.id ?? item.Id ?? item.ServiceId ?? '')
      const name = String(item.name ?? item.Name ?? item.OrganizationName ?? 'Unknown')
      const description = String(
        item.description ?? item.Description ?? item.ServiceDescription ?? '',
      )
      const address = formatAddress(item)
      const phone = String(item.phone ?? item.Phone ?? item.MainPhone ?? '')
      const url = String(item.url ?? item.Url ?? item.Website ?? '')
      const taxonomyCodes = extractTaxonomy(item)
      const languages = extractLanguages(item)

      return {
        slug: makeSlug('211', id || name),
        name,
        description: description.slice(0, 500),
        category: mapAirsCategory(taxonomyCodes),
        address: address || undefined,
        phone: phone || undefined,
        url: url || undefined,
        languages,
        source: '211' as const,
        externalUrl: `https://www.211.org/results/${encodeURIComponent(params.zipCode)}`,
      }
    })
  },
}

function formatAddress(item: Record<string, unknown>): string {
  const parts = [
    item.address ?? item.Address ?? item.PhysicalAddress ?? '',
    item.city ?? item.City ?? '',
    item.state ?? item.State ?? '',
    item.zipCode ?? item.ZipCode ?? item.PostalCode ?? '',
  ]
    .map(String)
    .filter(Boolean)
  return parts.join(', ')
}

function extractTaxonomy(item: Record<string, unknown>): string[] {
  const raw = item.taxonomyCodes ?? item.TaxonomyCodes ?? item.taxonomy ?? item.Taxonomy ?? []
  if (Array.isArray(raw)) {
    return raw.map((t: unknown) =>
      typeof t === 'string' ? t : String((t as Record<string, unknown>)?.code ?? (t as Record<string, unknown>)?.Code ?? ''),
    )
  }
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim())
  return []
}

function extractLanguages(item: Record<string, unknown>): string[] {
  const raw = item.languages ?? item.Languages ?? item.SpokenLanguages ?? []
  if (Array.isArray(raw)) {
    return raw.map((l: unknown) => (typeof l === 'string' ? l : String((l as Record<string, unknown>)?.name ?? l)))
  }
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim())
  return ['en']
}

// ── USDA Provider ────────────────────────────────────────────────

const providerUsda: ResourceProvider = {
  name: 'usda',
  async fetch(params: ProviderParams): Promise<CommunityResource[]> {
    const apiKey = Deno.env.get('USDA_API_KEY')
    // USDA FNS locator is publicly accessible
    const baseUrl = 'https://api.nal.usda.gov/fdc/v1/foods/search'

    // Use the SNAP/WIC retailer locator instead if available
    const snapUrl = new URL('https://usda-fns.hub.arcgis.com/datasets/USDA-FNS::snap-store-locations/api')
    // Fallback: query a simpler endpoint
    const searchUrl = new URL('https://www.fns.usda.gov/api/meals4kids')
    searchUrl.searchParams.set('zip', params.zipCode)
    searchUrl.searchParams.set('radius', String(params.radiusMiles))

    try {
      const res = await fetch(searchUrl.toString(), {
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) return []

      const data = await res.json()
      const sites: unknown[] = Array.isArray(data) ? data : (data?.sites ?? data?.results ?? [])

      return sites.slice(0, 15).map((site: Record<string, unknown>) => {
        const name = String(site.name ?? site.siteName ?? site.Name ?? 'Food Program')
        const address = [site.address ?? '', site.city ?? '', site.state ?? '', site.zip ?? '']
          .map(String)
          .filter(Boolean)
          .join(', ')

        return {
          slug: makeSlug('usda', name),
          name,
          description: String(site.description ?? site.type ?? 'USDA food assistance program'),
          category: 'food' as ResourceCategory,
          address: address || undefined,
          phone: String(site.phone ?? '') || undefined,
          url: undefined,
          languages: ['en'],
          source: 'usda' as const,
          externalUrl: 'https://www.fns.usda.gov/meals4kids',
        }
      })
    } catch {
      return []
    }
  },
}

// ── HRSA Provider ────────────────────────────────────────────────

const providerHrsa: ResourceProvider = {
  name: 'hrsa',
  async fetch(params: ProviderParams): Promise<CommunityResource[]> {
    const searchUrl = new URL(
      'https://findahealthcenter.hrsa.gov/recoverapi/api/search',
    )
    searchUrl.searchParams.set('zip', params.zipCode)
    searchUrl.searchParams.set('radius', String(params.radiusMiles))
    searchUrl.searchParams.set('pageSize', '15')

    try {
      const res = await fetch(searchUrl.toString(), {
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) return []

      const data = await res.json()
      const centers: unknown[] = Array.isArray(data)
        ? data
        : (data?.results ?? data?.healthCenters ?? data?.Results ?? [])

      return centers.slice(0, 15).map((center: Record<string, unknown>) => {
        const name = String(center.name ?? center.Name ?? center.CenterName ?? 'Health Center')
        const address = [
          center.address ?? center.Address ?? '',
          center.city ?? center.City ?? '',
          center.state ?? center.State ?? '',
          center.zip ?? center.Zip ?? '',
        ]
          .map(String)
          .filter(Boolean)
          .join(', ')

        const languages = extractLanguages(center)

        return {
          slug: makeSlug('hrsa', name),
          name,
          description: String(
            center.description ??
              center.operatingHours ??
              'Federally Qualified Health Center — sliding scale fees',
          ),
          category: 'health' as ResourceCategory,
          address: address || undefined,
          phone: String(center.phone ?? center.Phone ?? center.Telephone ?? '') || undefined,
          url: String(center.website ?? center.Website ?? '') || undefined,
          languages,
          source: 'hrsa' as const,
          externalUrl: 'https://findahealthcenter.hrsa.gov/',
        }
      })
    } catch {
      return []
    }
  },
}

// ── Provider registry ────────────────────────────────────────────

const PROVIDER_REGISTRY: Record<SourceName, ResourceProvider> = {
  '211': provider211,
  usda: providerUsda,
  hrsa: providerHrsa,
}

// ── Handler ──────────────────────────────────────────────────────

export async function handleCommunityResources(
  ctx: GatewayContext,
): Promise<Response> {
  const url = new URL(ctx.req.url)
  const zip = url.searchParams.get('zip')
  const categoryParam = url.searchParams.get('category')
  const locale = url.searchParams.get('locale')
  const sourcesParam = url.searchParams.get('sources') ?? '211'
  const radius = Number(url.searchParams.get('radius') ?? '10')

  // ── Validate ───────────────────────────────────────────────────
  if (!zip || !/^\d{5}$/.test(zip)) {
    return jsonError(400, 'invalid or missing zip parameter (5-digit US zip required)', ctx.origin)
  }

  if (categoryParam && !isValidCategory(categoryParam)) {
    return jsonError(
      400,
      `invalid category: ${categoryParam}. Valid: ${VALID_CATEGORIES.join(', ')}`,
      ctx.origin,
    )
  }

  if (isNaN(radius) || radius <= 0 || radius > 100) {
    return jsonError(400, 'radius must be between 1 and 100 miles', ctx.origin)
  }

  // ── Resolve providers ──────────────────────────────────────────
  const enabledSources = sourcesParam
    .split(',')
    .map((s) => s.trim())
    .filter(isValidSource)

  if (enabledSources.length === 0) {
    return jsonError(400, 'no valid sources specified', ctx.origin)
  }

  const providers = enabledSources
    .map((s) => PROVIDER_REGISTRY[s])
    .filter(Boolean)

  const params: ProviderParams = {
    zipCode: zip,
    radiusMiles: radius,
    category: categoryParam as ResourceCategory | undefined,
    locale: locale ?? undefined,
  }

  // ── Fetch from all providers in parallel ───────────────────────
  const results = await Promise.allSettled(
    providers.map((p) => p.fetch(params)),
  )

  const resources: CommunityResource[] = []
  const sourceErrors: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      resources.push(...result.value)
    } else {
      sourceErrors.push(providers[i].name)
      console.error(
        `[community-resources] ${providers[i].name} failed:`,
        result.reason,
      )
    }
  }

  // ── Apply category filter if requested ─────────────────────────
  const filtered = categoryParam
    ? resources.filter((r) => r.category === categoryParam)
    : resources

  // ── Return with caching ────────────────────────────────────────
  const body = JSON.stringify({
    resources: filtered,
    sources: enabledSources,
    ...(sourceErrors.length > 0 ? { sourceErrors } : {}),
    cachedAt: new Date().toISOString(),
  })

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(ctx.origin),
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
