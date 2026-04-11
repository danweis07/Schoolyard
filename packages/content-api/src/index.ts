export type {
  EventCategory,
  SchoolEvent,
  NewsPost,
  BoardMember,
  VolunteerRole,
  ResourceCategory,
  SchoolResource,
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
// Manifest types + fetch helpers (easy backend)
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
