/**
 * The adapter contract. Both the static (JSON-over-HTTP) and Supabase
 * adapters implement this interface so consumers written against
 * `ContentClient` don't care which backend they're hitting.
 *
 * Each method takes an optional `FetchOptions` bag for AbortSignal
 * forwarding and cache control.
 */
import type {
  SchoolEvent,
  NewsPost,
  BoardMember,
  VolunteerRole,
  SchoolResource,
  LunchMenu,
  TransportationRoute,
  CommunityListing,
  ClassroomTeacher,
  BudgetYear,
  Committee,
  Program,
  PtaNewsletter,
  SchoolInfo,
  SpiritStoreProduct,
  DirectoryEntry,
  SchoolForm,
  ConferenceWindow,
  ConferenceSlot,
} from '../types.js'
import type {
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  ManifestIndex,
  ManifestConfig,
} from '../manifest.js'

export interface FetchOptions {
  signal?: AbortSignal
  /** Bypass the in-memory LRU and force a fresh fetch. */
  noCache?: boolean
}

/**
 * Scope for a query — either "the single configured school" (no slug) or
 * an explicit school slug for multi-tenant deployments. The Supabase
 * adapter resolves slug → uuid once per client and caches the mapping.
 */
export interface Scope {
  schoolSlug?: string
}

export interface ContentAdapter {
  // School discovery — list available schools, optionally filtered by district
  fetchSchools(districtId?: string, options?: FetchOptions): Promise<SchoolInfo[]>

  // Discovery
  fetchManifest(scope?: Scope, options?: FetchOptions): Promise<ManifestIndex>
  fetchConfig(scope?: Scope, options?: FetchOptions): Promise<ManifestConfig>

  // Core collections — return the manifest shape with HTML body baked in
  fetchEvents(scope?: Scope, options?: FetchOptions): Promise<ManifestEvent[]>
  fetchNews(scope?: Scope, options?: FetchOptions): Promise<ManifestNewsPost[]>
  fetchBoard(scope?: Scope, options?: FetchOptions): Promise<ManifestBoardMember[]>
  fetchVolunteers(scope?: Scope, options?: FetchOptions): Promise<ManifestVolunteerRole[]>
  fetchResources(scope?: Scope, options?: FetchOptions): Promise<ManifestResource[]>

  // Newly exposed collections — raw shapes (no manifest wrapper yet)
  fetchLunchMenus(scope?: Scope, options?: FetchOptions): Promise<LunchMenu[]>
  fetchTransportationRoutes(scope?: Scope, options?: FetchOptions): Promise<TransportationRoute[]>
  fetchCommunityListings(scope?: Scope, options?: FetchOptions): Promise<CommunityListing[]>
  fetchClassroomTeachers(scope?: Scope, options?: FetchOptions): Promise<ClassroomTeacher[]>
  fetchBudgetYears(scope?: Scope, options?: FetchOptions): Promise<BudgetYear[]>
  fetchCommittees(scope?: Scope, options?: FetchOptions): Promise<Committee[]>
  fetchPrograms(scope?: Scope, options?: FetchOptions): Promise<Program[]>
  fetchPtaNewsletters(scope?: Scope, options?: FetchOptions): Promise<PtaNewsletter[]>

  // Spirit Store
  fetchSpiritStoreProducts(scope?: Scope, options?: FetchOptions): Promise<SpiritStoreProduct[]>

  // School Directory (requires auth — returns empty for anon)
  fetchDirectory(scope?: Scope, options?: FetchOptions): Promise<DirectoryEntry[]>

  // Forms
  fetchForms(scope?: Scope, options?: FetchOptions): Promise<SchoolForm[]>

  // Conferences
  fetchConferenceWindows(scope?: Scope, options?: FetchOptions): Promise<ConferenceWindow[]>
  fetchConferenceSlots(windowSlug: string, scope?: Scope, options?: FetchOptions): Promise<ConferenceSlot[]>
}

/** Local aliases re-exported for convenience. */
export type {
  SchoolEvent,
  NewsPost,
  BoardMember,
  VolunteerRole,
  SchoolResource,
  LunchMenu,
  TransportationRoute,
  CommunityListing,
  ClassroomTeacher,
  BudgetYear,
  Committee,
  Program,
  PtaNewsletter,
  SchoolInfo,
  SpiritStoreProduct,
  DirectoryEntry,
  SchoolForm,
  ConferenceWindow,
  ConferenceSlot,
}
