/**
 * Shared types for content shapes used by both web and mobile.
 *
 * The Astro side uses Zod schemas in apps/web/src/content/config.ts to
 * derive these types via inference. We mirror them here as plain TypeScript
 * so the mobile app can consume the same shapes without depending on Astro.
 */

export type EventCategory = 'fundraiser' | 'social' | 'academic' | 'volunteer' | 'other'

export interface SchoolEvent {
  slug: string
  title: string
  date: string // ISO date string
  endDate?: string
  time?: string
  location?: string
  description: string
  category: EventCategory
  registrationUrl?: string
  featured: boolean
  cancelled: boolean
}

export interface NewsPost {
  slug: string
  title: string
  publishDate: string // ISO date string
  author?: string
  summary: string
  tags: string[]
  featured: boolean
  image?: string
  imageAlt?: string
}

export interface BoardMember {
  slug: string
  name: string
  role: string
  email?: string
  photo?: string
  bio?: string
  termStart?: string
  termEnd?: string
  order: number
}

export interface VolunteerRole {
  slug: string
  title: string
  description: string
  commitment: string
  contact?: string
  filled: boolean
  order: number
}

export type ResourceCategory = 'food' | 'health' | 'housing' | 'legal' | 'mental-health' | 'other'

export type ResourceSource = 'curated' | '211' | 'usda' | 'hrsa'

export interface SchoolResource {
  slug: string
  name: string
  category: ResourceCategory
  description: string
  address?: string
  phone?: string
  url?: string
  languages: string[]
  /** Where this resource came from. Absent or 'curated' for school-maintained entries. */
  source?: ResourceSource
  /** For external resources, link to the provider's detail page. */
  externalUrl?: string
}

// ── Newly exposed shapes for modules that previously lived only in
// Astro content collections. Mobile + third-party consumers now get
// these through the unified content-api.

export interface LunchMenu {
  slug: string
  /** ISO date for the Monday of the week. */
  weekOf: string
  /** Optional end-of-week date; inferred if omitted. */
  weekEnd?: string
  /** Keyed day → list of items. Free-form JSON to allow school-specific shapes. */
  meals: Record<string, unknown>
  allergens: string[]
  freeReducedNote?: string
  pdfUrl?: string
}

export interface TransportationRoute {
  slug: string
  routeNumber: string
  routeName: string
  driver?: string
  morningArrival?: string
  afternoonDeparture?: string
  /** Ordered stops along the route. Schema is open to allow school variation. */
  stops: Array<Record<string, unknown>>
  notes?: string
  order: number
}

export type CommunityCategory =
  | 'classified'
  | 'carpool'
  | 'skill-share'
  | 'business'
  | 'new-family'
  | 'other'

export interface CommunityListing {
  slug: string
  title: string
  category: CommunityCategory
  description: string
  contact?: string
  neighborhood?: string
  postedDate?: string
  expiresDate?: string
  url?: string
  flaggedCount: number
  hidden: boolean
  order: number
}

export interface ClassroomTeacher {
  slug: string
  name: string
  grade: string
  subject?: string
  email?: string
  photo?: string
  bio?: string
  wishlist: Array<Record<string, unknown>>
  readingList: Array<Record<string, unknown>>
  order: number
}

export interface BudgetLineItem {
  category: string
  budgeted?: number
  actual?: number
  note?: string
}

export interface BudgetYear {
  slug: string
  year: number
  totalRaised: number
  totalSpent: number
  categories: BudgetLineItem[]
  summary?: string
  order: number
}

export interface Committee {
  slug: string
  name: string
  icon?: string
  description?: string
  meets?: string
  members: Array<Record<string, unknown>>
  order: number
}

export interface Program {
  slug: string
  name: string
  grades?: string
  schedule?: string
  description?: string
  funding?: string
  partner?: string
  /** Goal + raised are in cents to match the backend column type. */
  goalCents?: number
  raisedCents: number
  order: number
}

export interface PtaNewsletter {
  slug: string
  title: string
  pdfUrl?: string
  publishedAt: string
}

/**
 * Lightweight school record returned by `fetchSchools()`. Contains
 * enough data to populate a school picker and construct a runtime
 * config — branding, modules, and languages are the JSONB columns
 * from the `schools` table.
 */
export interface SchoolInfo {
  id: string
  slug: string
  name: string
  shortName: string
  branding: Record<string, unknown>
  modules: Record<string, unknown>
  languages: Record<string, unknown>
  districtId: string | null
}

// ── Spirit Store ────────────────────────────────────────────────────

export interface SpiritStoreVariant {
  label: string
}

export interface SpiritStoreProduct {
  slug: string
  name: string
  description?: string
  priceCents: number
  imageUrl?: string
  category?: string
  variants: SpiritStoreVariant[]
  maxQuantity?: number
  order: number
}

// ── School Directory ────────────────────────────────────────────────

export interface DirectoryEntry {
  familyName: string
  parentNames: string[]
  studentGrades: string[]
  email?: string
  phone?: string
  neighborhood?: string
  notes?: string
}
