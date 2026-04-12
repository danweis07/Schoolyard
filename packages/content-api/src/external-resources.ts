/**
 * Client for the community-resources gateway endpoint.
 *
 * This is NOT part of the ContentAdapter interface — external resources
 * are parameterized (zip, category, locale) and come from third-party
 * APIs (211.org, USDA, HRSA), not from school-owned content. Separate
 * API surface, shared domain types.
 *
 * Used by both web (client-side fetch) and mobile (React Query hook).
 */

import type { ResourceCategory, SchoolResource } from './types.js'

export interface ExternalResourcesOptions {
  /** Base URL of the Supabase project (e.g. https://xyz.supabase.co) */
  gatewayUrl: string
  /** 5-digit US zip code for the resource search */
  zipCode: string
  /** Filter results to a single category */
  category?: ResourceCategory
  /** Locale code for language pass-through to providers */
  locale?: string
  /** Which providers to query (default: ['211']) */
  sources?: string[]
  /** Search radius in miles (default: 10) */
  radiusMiles?: number
  /** School slug for gateway routing */
  schoolSlug?: string
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

export interface ExternalResourcesResult {
  resources: SchoolResource[]
  sources: string[]
  sourceErrors?: string[]
  cachedAt?: string
}

/**
 * Fetch community resources from external providers via the gateway.
 *
 * Calls: GET {gatewayUrl}/functions/v1/gateway/content/community-resources?school=...&zip=...
 */
export async function fetchExternalResources(
  options: ExternalResourcesOptions,
): Promise<ExternalResourcesResult> {
  const {
    gatewayUrl,
    zipCode,
    category,
    locale,
    sources,
    radiusMiles,
    schoolSlug,
    signal,
  } = options

  const url = new URL(
    `${gatewayUrl}/functions/v1/gateway/content/community-resources`,
  )

  if (schoolSlug) url.searchParams.set('school', schoolSlug)
  url.searchParams.set('zip', zipCode)
  if (category) url.searchParams.set('category', category)
  if (locale) url.searchParams.set('locale', locale)
  if (sources?.length) url.searchParams.set('sources', sources.join(','))
  if (radiusMiles) url.searchParams.set('radius', String(radiusMiles))

  const res = await fetch(url.toString(), {
    signal,
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `[external-resources] request failed (${res.status}): ${text}`,
    )
  }

  return (await res.json()) as ExternalResourcesResult
}
