/**
 * Mobile-side content client — one shared instance per school slug that
 * routes reads to the configured backend (gateway, direct Supabase, or
 * static JSON).
 *
 * Backend selection order:
 *
 *   1. `EXPO_PUBLIC_SCHOOLYARD_BACKEND` env var, if set
 *   2. `gateway` when a Supabase URL is present (default)
 *   3. `static` otherwise (reads from the school's deployed JSON API)
 *
 * The exported `fetch*` helpers accept an optional school slug so that
 * hooks can scope queries to the currently selected school.
 */
import { getSupabase } from './supabase'
import { createContentClient, type ContentAdapter } from '@schoolyard/content-api'
import type {
  ManifestIndex,
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  CommunityListing,
  SpiritStoreProduct,
  DirectoryEntry,
} from '@schoolyard/content-api'

export function getBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' ? (process.env?.EXPO_PUBLIC_MANIFEST_BASE_URL ?? '') : ''
  return envUrl || ''
}

export function hasBaseUrl(): boolean {
  return getBaseUrl().length > 0
}

function resolveBackend(): 'static' | 'supabase' | 'gateway' {
  const override = process.env?.EXPO_PUBLIC_SCHOOLYARD_BACKEND
  if (override === 'static' || override === 'supabase' || override === 'gateway') return override
  // Default to gateway when a Supabase URL is configured
  const supabaseUrl = process.env?.EXPO_PUBLIC_SUPABASE_URL
  return supabaseUrl ? 'gateway' : 'static'
}

// Cache clients by school slug so we don't recreate on every call
const clientCache = new Map<string, ContentAdapter>()

function getClient(schoolSlug?: string): ContentAdapter {
  const cacheKey = schoolSlug ?? '__default__'
  const cached = clientCache.get(cacheKey)
  if (cached) return cached

  const backend = resolveBackend()
  let client: ContentAdapter
  if (backend === 'gateway') {
    client = createContentClient({
      backend: 'gateway',
      gatewayUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      defaultSchoolSlug: schoolSlug,
    })
  } else if (backend === 'supabase') {
    const supabase = getSupabase()!
    client = createContentClient({
      backend: 'supabase',
      supabase,
      defaultSchoolSlug: schoolSlug,
    })
  } else {
    client = createContentClient({
      backend: 'static',
      baseUrl: getBaseUrl(),
    })
  }

  clientCache.set(cacheKey, client)
  return client
}

/** Clear cached clients when switching schools. */
export function clearClientCache() {
  clientCache.clear()
}

// ── Fetch helpers scoped by school slug ──────────────────────────

export function fetchManifest(signal?: AbortSignal, schoolSlug?: string): Promise<ManifestIndex> {
  return getClient(schoolSlug).fetchManifest(undefined, { signal })
}

export function fetchEvents(signal?: AbortSignal, schoolSlug?: string): Promise<ManifestEvent[]> {
  return getClient(schoolSlug).fetchEvents(undefined, { signal })
}

export function fetchNews(signal?: AbortSignal, schoolSlug?: string): Promise<ManifestNewsPost[]> {
  return getClient(schoolSlug).fetchNews(undefined, { signal })
}

export function fetchBoard(
  signal?: AbortSignal,
  schoolSlug?: string,
): Promise<ManifestBoardMember[]> {
  return getClient(schoolSlug).fetchBoard(undefined, { signal })
}

export function fetchVolunteers(
  signal?: AbortSignal,
  schoolSlug?: string,
): Promise<ManifestVolunteerRole[]> {
  return getClient(schoolSlug).fetchVolunteers(undefined, { signal })
}

export function fetchResources(
  signal?: AbortSignal,
  schoolSlug?: string,
): Promise<ManifestResource[]> {
  return getClient(schoolSlug).fetchResources(undefined, { signal })
}

export function fetchCommunityListings(
  signal?: AbortSignal,
  schoolSlug?: string,
): Promise<CommunityListing[]> {
  return getClient(schoolSlug).fetchCommunityListings(undefined, { signal })
}

export function fetchSpiritStoreProducts(signal?: AbortSignal): Promise<SpiritStoreProduct[]> {
  return getClient().fetchSpiritStoreProducts(undefined, { signal })
}

export function fetchDirectory(signal?: AbortSignal): Promise<DirectoryEntry[]> {
  return getClient().fetchDirectory(undefined, { signal })
}
