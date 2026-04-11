/**
 * Build-time content manifest — the "easy backend" JSON API.
 *
 * The generator script (`scripts/generate-manifest.ts`) walks the Astro
 * content collections and writes these shapes as JSON files under
 * `apps/web/dist/api/`. Web uses Astro's own content pipeline directly,
 * but the mobile app and third-party integrations consume these JSON
 * files over HTTP.
 *
 * No database, no server — the "API" is just static files served by the
 * same CDN that hosts the HTML.
 */

import type { SchoolEvent, NewsPost, BoardMember, VolunteerRole, SchoolResource } from './types.js'

/**
 * A content item with its Markdown body rendered to HTML.
 * Mobile apps and integrations get ready-to-render HTML without needing
 * a Markdown parser of their own.
 */
export type WithHtmlBody<T> = T & {
  /** The Markdown body rendered to sanitized HTML. Empty string if no body. */
  htmlBody: string
}

export type ManifestEvent = WithHtmlBody<SchoolEvent>
export type ManifestNewsPost = WithHtmlBody<NewsPost>
export type ManifestBoardMember = WithHtmlBody<BoardMember>
export type ManifestVolunteerRole = WithHtmlBody<VolunteerRole>
export type ManifestResource = WithHtmlBody<SchoolResource>

/**
 * Minimal school identity used in the manifest index.
 * Derived from `school.config.json` at build time — strips contact details
 * that the homepage already exposes and avoids duplicating the full config.
 */
export interface ManifestSchoolIdentity {
  name: string
  shortName: string
  mascot: string
  tagline: string
  district: string
  timezone: string
}

export interface ManifestCollectionCounts {
  events: number
  news: number
  board: number
  volunteers: number
  resources: number
}

/**
 * The top-level index file. Clients fetch this first to discover what's
 * available and when it was last built, then fetch the individual
 * collection files.
 */
export interface ManifestIndex {
  /** Manifest schema version. Bump when making breaking changes. */
  version: number
  /** When the manifest was generated, ISO 8601. */
  generatedAt: string
  /** Whether the source config is in single-tenant or district mode. */
  tenantMode: 'single' | 'district'
  /** For district mode, which school this manifest belongs to (empty in single mode). */
  tenantSlug: string
  /** Basic school identity — everything else lives in config.json. */
  school: ManifestSchoolIdentity
  /** Supported locales for this school. */
  locales: string[]
  /** Which modules are enabled — mirrors school.config.json. */
  enabledModules: string[]
  /** Per-collection item counts. */
  counts: ManifestCollectionCounts
}

/**
 * The sanitized config file. Strips any field marked sensitive
 * (currently just `fundraising.stripePublishableKey`).
 *
 * We use `unknown` here to keep the content-api package free of a
 * dependency on @schoolyard/config. Consumers that need the typed shape
 * import it from @schoolyard/config directly.
 */
export type ManifestConfig = Record<string, unknown>

// ────────────────────────────────────────────────────────────────────
// Fetch helpers — used by the mobile app and any other JSON consumer.
// Pure fetch() — no Node dependencies. Safe to call from React Native.
// ────────────────────────────────────────────────────────────────────

/**
 * Joins a base URL with a manifest path, ensuring exactly one slash
 * between them. `baseUrl` can be with or without a trailing slash.
 */
function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const rel = path.replace(/^\/+/, '')
  return `${base}/${rel}`
}

interface FetchOptions {
  /** AbortSignal forwarded to fetch(). */
  signal?: AbortSignal
  /** Override the global fetch — useful for tests. */
  fetchImpl?: typeof fetch
}

async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const fetchFn = options.fetchImpl ?? fetch
  const res = await fetchFn(url, { signal: options.signal })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export function manifestUrl(baseUrl: string, path = 'manifest.json'): string {
  return joinUrl(baseUrl, `api/${path}`)
}

export function fetchManifest(baseUrl: string, options?: FetchOptions): Promise<ManifestIndex> {
  return fetchJson<ManifestIndex>(manifestUrl(baseUrl), options)
}

export function fetchConfig(baseUrl: string, options?: FetchOptions): Promise<ManifestConfig> {
  return fetchJson<ManifestConfig>(manifestUrl(baseUrl, 'config.json'), options)
}

export function fetchEvents(baseUrl: string, options?: FetchOptions): Promise<ManifestEvent[]> {
  return fetchJson<ManifestEvent[]>(manifestUrl(baseUrl, 'events.json'), options)
}

export function fetchNews(baseUrl: string, options?: FetchOptions): Promise<ManifestNewsPost[]> {
  return fetchJson<ManifestNewsPost[]>(manifestUrl(baseUrl, 'news.json'), options)
}

export function fetchBoard(
  baseUrl: string,
  options?: FetchOptions,
): Promise<ManifestBoardMember[]> {
  return fetchJson<ManifestBoardMember[]>(manifestUrl(baseUrl, 'board.json'), options)
}

export function fetchVolunteers(
  baseUrl: string,
  options?: FetchOptions,
): Promise<ManifestVolunteerRole[]> {
  return fetchJson<ManifestVolunteerRole[]>(manifestUrl(baseUrl, 'volunteers.json'), options)
}

export function fetchResources(
  baseUrl: string,
  options?: FetchOptions,
): Promise<ManifestResource[]> {
  return fetchJson<ManifestResource[]>(manifestUrl(baseUrl, 'resources.json'), options)
}

/**
 * District mode helpers — used when a single deployment serves multiple
 * schools. The per-school manifest lives at `api/schools/<slug>/*.json`.
 */
export function tenantManifestUrl(baseUrl: string, slug: string, path = 'manifest.json'): string {
  return joinUrl(baseUrl, `api/schools/${slug}/${path}`)
}

export function fetchTenantManifest(
  baseUrl: string,
  slug: string,
  options?: FetchOptions,
): Promise<ManifestIndex> {
  return fetchJson<ManifestIndex>(tenantManifestUrl(baseUrl, slug), options)
}

export function fetchTenantEvents(
  baseUrl: string,
  slug: string,
  options?: FetchOptions,
): Promise<ManifestEvent[]> {
  return fetchJson<ManifestEvent[]>(tenantManifestUrl(baseUrl, slug, 'events.json'), options)
}

export function fetchTenantNews(
  baseUrl: string,
  slug: string,
  options?: FetchOptions,
): Promise<ManifestNewsPost[]> {
  return fetchJson<ManifestNewsPost[]>(tenantManifestUrl(baseUrl, slug, 'news.json'), options)
}
