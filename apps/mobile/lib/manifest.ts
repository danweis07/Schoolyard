/**
 * Mobile-side content client — one shared instance per school slug that
 * routes reads to the configured backend (static JSON or Supabase).
 *
 * Backend selection order:
 *
 *   1. `EXPO_PUBLIC_SCHOOLYARD_BACKEND` env var, if set
 *   2. `supabase` when a Supabase URL + anon key are present
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
} from '@schoolyard/content-api'

export function getBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' ? (process.env?.EXPO_PUBLIC_MANIFEST_BASE_URL ?? '') : ''
  return envUrl || ''
}

export function hasBaseUrl(): boolean {
  return getBaseUrl().length > 0
}

function resolveBackend(): 'static' | 'supabase' {
  const override = process.env?.EXPO_PUBLIC_SCHOOLYARD_BACKEND
  if (override === 'static' || override === 'supabase') return override
  return getSupabase() ? 'supabase' : 'static'
}

// Cache clients by school slug so we don't recreate on every call
const clientCache = new Map<string, ContentAdapter>()

function getClient(schoolSlug?: string): ContentAdapter {
  const cacheKey = schoolSlug ?? '__default__'
  const cached = clientCache.get(cacheKey)
  if (cached) return cached

  const backend = resolveBackend()
  let client: ContentAdapter
  if (backend === 'supabase') {
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
