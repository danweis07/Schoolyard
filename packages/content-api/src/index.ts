export type {
  EventCategory,
  SchoolEvent,
  NewsPost,
  BoardMember,
  VolunteerRole,
  ResourceCategory,
  SchoolResource,
  LunchMenu,
  TransportationRoute,
  CommunityCategory,
  CommunityListing,
  ClassroomTeacher,
  BudgetLineItem,
  BudgetYear,
  Committee,
  Program,
  PtaNewsletter,
} from './types.js'

export {
  sortByDateAsc,
  sortByDateDesc,
  getUpcomingEvents,
  getPastEvents,
  getFeaturedEvent,
} from './events.js'

export { sortNewsDesc, getFeaturedNews, getNewsBySlug, filterByTag } from './news.js'

export { sortBoard } from './board.js'

// ─────────────────────────────────────────────
// Manifest types + legacy (static) fetch helpers
// ─────────────────────────────────────────────
export type {
  WithHtmlBody,
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  ManifestSchoolIdentity,
  ManifestCollectionCounts,
  ManifestIndex,
  ManifestConfig,
} from './manifest.js'

export {
  manifestUrl,
  fetchManifest,
  fetchConfig,
  fetchEvents,
  fetchNews,
  fetchBoard,
  fetchVolunteers,
  fetchResources,
  tenantManifestUrl,
  fetchTenantManifest,
  fetchTenantEvents,
  fetchTenantNews,
} from './manifest.js'

// ─────────────────────────────────────────────
// New adapter router (use this for anything new)
// ─────────────────────────────────────────────
export { createContentClient } from './client.js'
export type { ContentBackend, ContentClientOptions } from './client.js'
export type { ContentAdapter, FetchOptions, Scope } from './adapters/types.js'
export { createStaticAdapter } from './adapters/static.js'
export type { StaticAdapterOptions } from './adapters/static.js'
export { createSupabaseAdapter } from './adapters/supabase.js'
export type { SupabaseAdapterOptions } from './adapters/supabase.js'
export { createGatewayAdapter } from './adapters/gateway.js'
export type { GatewayAdapterOptions } from './adapters/gateway.js'
