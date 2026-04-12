/**
 * Static adapter — reads pre-rendered JSON files produced by
 * `scripts/generate-manifest.ts`. This is the legacy path; it keeps the
 * existing `dist/api/*.json` layout working while the Supabase adapter
 * is rolled out.
 *
 * For the modules that previously lived only in Astro content
 * collections (lunch, transportation, community, classroom, budget,
 * committees, programs, newsletters) this adapter returns `[]` — the
 * static manifest generator doesn't emit JSON for them yet. Consumers
 * that need those collections must run the Supabase adapter.
 */
import type { ContentAdapter, FetchOptions, Scope } from './types.js'
import {
  fetchManifest as manifestFetchManifest,
  fetchConfig as manifestFetchConfig,
  fetchEvents as manifestFetchEvents,
  fetchNews as manifestFetchNews,
  fetchBoard as manifestFetchBoard,
  fetchVolunteers as manifestFetchVolunteers,
  fetchResources as manifestFetchResources,
  fetchTenantManifest as manifestFetchTenantManifest,
  tenantManifestUrl,
} from '../manifest.js'
import type {
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  ManifestIndex,
  ManifestConfig,
} from '../manifest.js'

export interface StaticAdapterOptions {
  /** Base URL of the deployed Schoolyard site (e.g. https://longfellow.example.org). */
  baseUrl: string
  /** Override the global fetch — useful for tests. */
  fetchImpl?: typeof fetch
}

function legacyFetchOptions(options?: FetchOptions) {
  return options?.signal ? { signal: options.signal } : undefined
}

export function createStaticAdapter(options: StaticAdapterOptions): ContentAdapter {
  const { baseUrl } = options

  function tenantScoped(
    scope: Scope | undefined,
    path: string,
  ): { baseUrl: string; tenantPath: string } {
    if (scope?.schoolSlug) {
      return {
        baseUrl,
        tenantPath: tenantManifestUrl(baseUrl, scope.schoolSlug, path),
      }
    }
    return { baseUrl, tenantPath: '' }
  }

  async function fetchTenantJson<T>(url: string, options?: FetchOptions): Promise<T> {
    const fetchFn = (options as { fetchImpl?: typeof fetch } | undefined)?.fetchImpl ?? fetch
    const res = await fetchFn(url, { signal: options?.signal })
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as T
  }

  return {
    // Static adapter has no school directory — returns empty.
    // Callers that need school discovery must use the Supabase adapter.
    async fetchSchools() {
      return []
    },

    async fetchManifest(scope, fetchOptions): Promise<ManifestIndex> {
      if (scope?.schoolSlug) {
        return manifestFetchTenantManifest(
          baseUrl,
          scope.schoolSlug,
          legacyFetchOptions(fetchOptions),
        )
      }
      return manifestFetchManifest(baseUrl, legacyFetchOptions(fetchOptions))
    },

    async fetchConfig(scope, fetchOptions): Promise<ManifestConfig> {
      if (scope?.schoolSlug) {
        const { tenantPath } = tenantScoped(scope, 'config.json')
        return fetchTenantJson<ManifestConfig>(tenantPath, fetchOptions)
      }
      return manifestFetchConfig(baseUrl, legacyFetchOptions(fetchOptions))
    },

    async fetchEvents(scope, fetchOptions): Promise<ManifestEvent[]> {
      if (scope?.schoolSlug) {
        const { tenantPath } = tenantScoped(scope, 'events.json')
        return fetchTenantJson<ManifestEvent[]>(tenantPath, fetchOptions)
      }
      return manifestFetchEvents(baseUrl, legacyFetchOptions(fetchOptions))
    },

    async fetchNews(scope, fetchOptions): Promise<ManifestNewsPost[]> {
      if (scope?.schoolSlug) {
        const { tenantPath } = tenantScoped(scope, 'news.json')
        return fetchTenantJson<ManifestNewsPost[]>(tenantPath, fetchOptions)
      }
      return manifestFetchNews(baseUrl, legacyFetchOptions(fetchOptions))
    },

    async fetchBoard(scope, fetchOptions): Promise<ManifestBoardMember[]> {
      if (scope?.schoolSlug) {
        const { tenantPath } = tenantScoped(scope, 'board.json')
        return fetchTenantJson<ManifestBoardMember[]>(tenantPath, fetchOptions)
      }
      return manifestFetchBoard(baseUrl, legacyFetchOptions(fetchOptions))
    },

    async fetchVolunteers(scope, fetchOptions): Promise<ManifestVolunteerRole[]> {
      if (scope?.schoolSlug) {
        const { tenantPath } = tenantScoped(scope, 'volunteers.json')
        return fetchTenantJson<ManifestVolunteerRole[]>(tenantPath, fetchOptions)
      }
      return manifestFetchVolunteers(baseUrl, legacyFetchOptions(fetchOptions))
    },

    async fetchResources(scope, fetchOptions): Promise<ManifestResource[]> {
      if (scope?.schoolSlug) {
        const { tenantPath } = tenantScoped(scope, 'resources.json')
        return fetchTenantJson<ManifestResource[]>(tenantPath, fetchOptions)
      }
      return manifestFetchResources(baseUrl, legacyFetchOptions(fetchOptions))
    },

    // Collections not present in the legacy manifest — static adapter
    // returns empty arrays so consumers degrade gracefully. Callers that
    // need these must use the Supabase adapter.
    async fetchLunchMenus() {
      return []
    },
    async fetchTransportationRoutes() {
      return []
    },
    async fetchCommunityListings() {
      return []
    },
    async fetchClassroomTeachers() {
      return []
    },
    async fetchBudgetYears() {
      return []
    },
    async fetchCommittees() {
      return []
    },
    async fetchPrograms() {
      return []
    },
    async fetchPtaNewsletters() {
      return []
    },
    async fetchSpiritStoreProducts() {
      return []
    },
    async fetchDirectory() {
      return []
    },
    async fetchForms() {
      return []
    },
    async fetchConferenceWindows() {
      return []
    },
    async fetchConferenceSlots() {
      return []
    },
    // Notifications require a backend — static adapter returns empty arrays.
    async fetchNotifications() {
      return []
    },
    async fetchNotificationTemplates() {
      return []
    },
  }
}
