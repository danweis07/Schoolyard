/**
 * Gateway adapter — reads content through the gateway edge function
 * instead of querying Supabase directly.
 *
 * The gateway returns already-mapped shapes, so this adapter is a
 * thin HTTP client. Works in browser, Node, Deno, and React Native.
 */

import type { ContentAdapter, FetchOptions, Scope } from './types.js'
import type {
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  ManifestIndex,
  ManifestConfig,
} from '../manifest.js'
import type {
  LunchMenu,
  TransportationRoute,
  CommunityListing,
  ClassroomTeacher,
  BudgetYear,
  Committee,
  Program,
  PtaNewsletter,
  SchoolInfo,
} from '../types.js'

export interface GatewayAdapterOptions {
  /** Base URL of the Supabase project (e.g. https://xyz.supabase.co) */
  gatewayUrl: string
  /** Default school slug when Scope.schoolSlug is omitted. */
  defaultSchoolSlug?: string
}

export function createGatewayAdapter(options: GatewayAdapterOptions): ContentAdapter {
  const { gatewayUrl, defaultSchoolSlug } = options

  function resolveSlug(scope?: Scope): string {
    const slug = scope?.schoolSlug ?? defaultSchoolSlug
    if (!slug) {
      throw new Error('[gateway-adapter] no school slug provided and no defaultSchoolSlug was set')
    }
    return slug
  }

  async function get<T>(resource: string, scope?: Scope, fetchOptions?: FetchOptions): Promise<T> {
    const slug = resolveSlug(scope)
    const url = `${gatewayUrl}/functions/v1/gateway/content/${resource}?school=${encodeURIComponent(slug)}`

    const res = await fetch(url, {
      signal: fetchOptions?.signal,
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`[gateway-adapter] ${resource} failed (${res.status}): ${text}`)
    }

    return (await res.json()) as T
  }

  return {
    async fetchSchools(_districtId, fetchOptions): Promise<SchoolInfo[]> {
      const url = `${gatewayUrl}/functions/v1/gateway/content/schools`
      const res = await fetch(url, {
        signal: fetchOptions?.signal,
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) return []
      return (await res.json()) as SchoolInfo[]
    },
    fetchManifest(scope, options) {
      return get<ManifestIndex>('manifest', scope, options)
    },
    fetchConfig(scope, options) {
      return get<ManifestConfig>('config', scope, options)
    },
    fetchEvents(scope, options) {
      return get<ManifestEvent[]>('events', scope, options)
    },
    fetchNews(scope, options) {
      return get<ManifestNewsPost[]>('news', scope, options)
    },
    fetchBoard(scope, options) {
      return get<ManifestBoardMember[]>('board', scope, options)
    },
    fetchVolunteers(scope, options) {
      return get<ManifestVolunteerRole[]>('volunteers', scope, options)
    },
    fetchResources(scope, options) {
      return get<ManifestResource[]>('resources', scope, options)
    },
    fetchLunchMenus(scope, options) {
      return get<LunchMenu[]>('lunch-menus', scope, options)
    },
    fetchTransportationRoutes(scope, options) {
      return get<TransportationRoute[]>('transportation', scope, options)
    },
    fetchCommunityListings(scope, options) {
      return get<CommunityListing[]>('community', scope, options)
    },
    fetchClassroomTeachers(scope, options) {
      return get<ClassroomTeacher[]>('teachers', scope, options)
    },
    fetchBudgetYears(scope, options) {
      return get<BudgetYear[]>('budget', scope, options)
    },
    fetchCommittees(scope, options) {
      return get<Committee[]>('committees', scope, options)
    },
    fetchPrograms(scope, options) {
      return get<Program[]>('programs', scope, options)
    },
    fetchPtaNewsletters(scope, options) {
      return get<PtaNewsletter[]>('newsletters', scope, options)
    },
  }
}
