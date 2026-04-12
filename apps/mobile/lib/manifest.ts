/**
 * Mobile-side content client — one shared instance that routes reads
 * to the configured backend (static JSON or Supabase).
 *
 * Backend selection order:
 *
 *   1. `EXPO_PUBLIC_SCHOOLYARD_BACKEND` env var, if set
 *   2. `supabase` when a Supabase URL + anon key are present
 *   3. `static` otherwise (reads from the school's deployed JSON API)
 *
 * The exported `fetch*` helpers keep their original signatures so the
 * existing hooks (`useEvents`, `useNews`, …) don't need to change.
 */
import { siteConfig } from './config'
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
  return envUrl || siteConfig.deployment.siteUrl || ''
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

function resolveSchoolSlug(): string {
  const envSlug = process.env?.EXPO_PUBLIC_SCHOOLYARD_SCHOOL_SLUG
  if (envSlug) return envSlug
  return siteConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

let client: ContentAdapter | null = null

function getClient(): ContentAdapter {
  if (client) return client
  const backend = resolveBackend()
  if (backend === 'gateway') {
    client = createContentClient({
      backend: 'gateway',
      gatewayUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      defaultSchoolSlug: resolveSchoolSlug(),
    })
  } else if (backend === 'supabase') {
    const supabase = getSupabase()!
    client = createContentClient({
      backend: 'supabase',
      supabase,
      defaultSchoolSlug: resolveSchoolSlug(),
    })
  } else {
    client = createContentClient({
      backend: 'static',
      baseUrl: getBaseUrl(),
    })
  }
  return client
}

// ── Back-compat helpers keeping the old signature ──────────────────

export function fetchManifest(signal?: AbortSignal): Promise<ManifestIndex> {
  return getClient().fetchManifest(undefined, { signal })
}

export function fetchEvents(signal?: AbortSignal): Promise<ManifestEvent[]> {
  return getClient().fetchEvents(undefined, { signal })
}

export function fetchNews(signal?: AbortSignal): Promise<ManifestNewsPost[]> {
  return getClient().fetchNews(undefined, { signal })
}

export function fetchBoard(signal?: AbortSignal): Promise<ManifestBoardMember[]> {
  return getClient().fetchBoard(undefined, { signal })
}

export function fetchVolunteers(signal?: AbortSignal): Promise<ManifestVolunteerRole[]> {
  return getClient().fetchVolunteers(undefined, { signal })
}

export function fetchResources(signal?: AbortSignal): Promise<ManifestResource[]> {
  return getClient().fetchResources(undefined, { signal })
}

export function fetchCommunityListings(signal?: AbortSignal): Promise<CommunityListing[]> {
  return getClient().fetchCommunityListings(undefined, { signal })
}
