/**
 * Shared Markdown → normalized-object pipeline.
 *
 * Both `scripts/generate-manifest.ts` (legacy static JSON output) and
 * `scripts/migrate-to-supabase.ts` (Postgres seeder) depend on the same
 * parsing + normalization so the two backends stay bit-for-bit
 * consistent. Never duplicate this logic — add helpers here and import
 * them from both callers.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { SchoolConfig } from '@schoolyard/config'
import type {
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  ManifestConfig,
  LunchMenu,
  TransportationRoute,
  CommunityListing,
  ClassroomTeacher,
  BudgetYear,
  BudgetLineItem,
  Committee,
  Program,
  PtaNewsletter,
} from '@schoolyard/content-api'

marked.setOptions({ gfm: true, breaks: false })

export interface ParsedContent {
  slug: string
  data: Record<string, unknown>
  htmlBody: string
  rawBody: string
}

/**
 * Reads a directory of `.md` files and returns slug + frontmatter +
 * rendered HTML + raw Markdown body for each. Missing directories return
 * an empty array so disabled or future modules don't break the build.
 */
export function readMarkdownCollection(collectionDir: string): ParsedContent[] {
  if (!existsSync(collectionDir)) return []

  const entries = readdirSync(collectionDir, { withFileTypes: true })
  const results: ParsedContent[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (extname(entry.name) !== '.md') continue

    const filePath = join(collectionDir, entry.name)
    const slug = basename(entry.name, '.md')
    const raw = readFileSync(filePath, 'utf8')
    const parsed = matter(raw)
    const htmlBody = parsed.content.trim() ? String(marked.parse(parsed.content)) : ''

    results.push({
      slug,
      data: parsed.data as Record<string, unknown>,
      htmlBody,
      rawBody: parsed.content,
    })
  }

  return results
}

/**
 * Coerces a frontmatter date (which gray-matter may parse as a Date,
 * a string, or leave as-is) to an ISO-8601 string. Returns the current
 * timestamp if the value is missing.
 */
export function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
    return value
  }
  return new Date().toISOString()
}

function optionalString(value: unknown): string | undefined {
  return value ? String(value) : undefined
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

// ── Core collections (mirrors generate-manifest.ts shapes) ─────────

export function normalizeEvent(item: ParsedContent): ManifestEvent {
  const data = item.data
  return {
    slug: item.slug,
    title: String(data.title ?? ''),
    date: toIsoDate(data.date),
    endDate: data.endDate ? toIsoDate(data.endDate) : undefined,
    time: optionalString(data.time),
    location: optionalString(data.location),
    description: String(data.description ?? ''),
    category: (data.category as ManifestEvent['category']) ?? 'other',
    registrationUrl: optionalString(data.registrationUrl),
    featured: Boolean(data.featured),
    cancelled: Boolean(data.cancelled),
    htmlBody: item.htmlBody,
  }
}

export function normalizeNews(item: ParsedContent): ManifestNewsPost {
  const data = item.data
  return {
    slug: item.slug,
    title: String(data.title ?? ''),
    publishDate: toIsoDate(data.publishDate),
    author: optionalString(data.author),
    summary: String(data.summary ?? ''),
    tags: arrayOfStrings(data.tags),
    featured: Boolean(data.featured),
    image: optionalString(data.image),
    imageAlt: optionalString(data.imageAlt),
    htmlBody: item.htmlBody,
  }
}

export function normalizeBoard(item: ParsedContent): ManifestBoardMember {
  const data = item.data
  return {
    slug: item.slug,
    name: String(data.name ?? ''),
    role: String(data.role ?? ''),
    email: optionalString(data.email),
    photo: optionalString(data.photo),
    bio: optionalString(data.bio),
    termStart: optionalString(data.termStart),
    termEnd: optionalString(data.termEnd),
    order: typeof data.order === 'number' ? data.order : 99,
    htmlBody: item.htmlBody,
  }
}

export function normalizeVolunteer(item: ParsedContent): ManifestVolunteerRole {
  const data = item.data
  return {
    slug: item.slug,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    commitment: String(data.commitment ?? ''),
    contact: optionalString(data.contact),
    filled: Boolean(data.filled),
    order: typeof data.order === 'number' ? data.order : 99,
    htmlBody: item.htmlBody,
  }
}

export function normalizeResource(item: ParsedContent): ManifestResource {
  const data = item.data
  return {
    slug: item.slug,
    name: String(data.name ?? ''),
    category: (data.category as ManifestResource['category']) ?? 'other',
    description: String(data.description ?? ''),
    address: optionalString(data.address),
    phone: optionalString(data.phone),
    url: optionalString(data.url),
    languages: Array.isArray(data.languages) ? data.languages.map(String) : ['en'],
    htmlBody: item.htmlBody,
  }
}

// ── Newly exposed collections (Supabase-only for now) ──────────────

export function normalizeLunchMenu(item: ParsedContent): LunchMenu {
  const data = item.data
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
  const meals: Record<string, string> = {}
  for (const day of days) {
    meals[day] = String(data[day] ?? '')
  }
  return {
    slug: item.slug,
    weekOf: toIsoDate(data.weekStart).slice(0, 10),
    weekEnd: data.weekEnd ? toIsoDate(data.weekEnd).slice(0, 10) : undefined,
    meals,
    allergens: arrayOfStrings(data.allergens),
    freeReducedNote: optionalString(data.freeReducedNote),
    pdfUrl: optionalString(data.pdfUrl),
  }
}

export function normalizeTransportationRoute(item: ParsedContent): TransportationRoute {
  const data = item.data
  return {
    slug: item.slug,
    routeNumber: String(data.routeNumber ?? ''),
    routeName: String(data.routeName ?? ''),
    driver: optionalString(data.driver),
    morningArrival: optionalString(data.morningArrival),
    afternoonDeparture: optionalString(data.afternoonDeparture),
    stops: arrayOfRecords(data.stops),
    notes: optionalString(data.notes),
    order: typeof data.order === 'number' ? data.order : 99,
  }
}

export function normalizeCommunityListing(item: ParsedContent): CommunityListing {
  const data = item.data
  return {
    slug: item.slug,
    title: String(data.title ?? ''),
    category: (data.category as CommunityListing['category']) ?? 'other',
    description: String(data.description ?? ''),
    contact: optionalString(data.contact),
    neighborhood: optionalString(data.neighborhood),
    postedDate: data.postedDate ? toIsoDate(data.postedDate).slice(0, 10) : undefined,
    expiresDate: data.expiresDate ? toIsoDate(data.expiresDate).slice(0, 10) : undefined,
    url: optionalString(data.url),
    flaggedCount: 0,
    hidden: false,
    order: typeof data.order === 'number' ? data.order : 99,
  }
}

export function normalizeClassroomTeacher(item: ParsedContent): ClassroomTeacher {
  const data = item.data
  return {
    slug: item.slug,
    name: String(data.name ?? ''),
    grade: String(data.grade ?? ''),
    subject: optionalString(data.subject),
    email: optionalString(data.email),
    photo: optionalString(data.photo),
    bio: item.rawBody || undefined,
    wishlist: arrayOfStrings(data.wishlist).map((item) => ({ item })),
    readingList: arrayOfStrings(data.readingList).map((item) => ({ item })),
    order: typeof data.order === 'number' ? data.order : 99,
  }
}

export function normalizeBudgetYear(item: ParsedContent): BudgetYear {
  const data = item.data
  const rawCategories = Array.isArray(data.categories)
    ? (data.categories as Array<Record<string, unknown>>)
    : []
  const categories: BudgetLineItem[] = rawCategories.map((c) => ({
    category: String(c.name ?? ''),
    budgeted: typeof c.amount === 'number' ? c.amount : undefined,
    actual: undefined,
    note: typeof c.percent === 'number' ? `${c.percent}%` : undefined,
  }))
  return {
    slug: item.slug,
    year: Number(data.year ?? new Date().getFullYear()),
    totalRaised: typeof data.totalRaised === 'number' ? data.totalRaised : 0,
    totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
    categories,
    summary: optionalString(data.summary),
    order: typeof data.order === 'number' ? data.order : 99,
  }
}

export function normalizeCommittee(item: ParsedContent): Committee {
  const data = item.data
  return {
    slug: item.slug,
    name: String(data.name ?? ''),
    icon: optionalString(data.icon),
    description: String(data.description ?? ''),
    meets: optionalString(data.meets),
    members: data.members ? [{ summary: String(data.members) }] : [],
    order: typeof data.order === 'number' ? data.order : 99,
  }
}

export function normalizeProgram(item: ParsedContent): Program {
  const data = item.data
  return {
    slug: item.slug,
    name: String(data.name ?? ''),
    grades: optionalString(data.grades),
    schedule: optionalString(data.schedule),
    description: String(data.description ?? ''),
    funding: optionalString(data.funding),
    partner: optionalString(data.partner),
    goalCents: typeof data.goalCents === 'number' ? data.goalCents : undefined,
    raisedCents: typeof data.raisedCents === 'number' ? data.raisedCents : 0,
    order: typeof data.order === 'number' ? data.order : 99,
  }
}

export function normalizePtaNewsletter(item: ParsedContent): PtaNewsletter {
  const data = item.data
  return {
    slug: item.slug,
    title: String(data.title ?? ''),
    pdfUrl: optionalString(data.pdfUrl),
    publishedAt: toIsoDate(data.publishedAt ?? data.publishDate),
  }
}

// ── Config sanitization ─────────────────────────────────────────────

/**
 * Returns a copy of the school config with secret/internal fields
 * removed. Used before publishing config.json or inserting into Postgres.
 */
export function sanitizeConfig(config: SchoolConfig): ManifestConfig {
  const clone = JSON.parse(JSON.stringify(config)) as Record<string, unknown>
  if (clone.fundraising && typeof clone.fundraising === 'object') {
    const f = clone.fundraising as Record<string, unknown>
    delete f.stripeSecretKey
  }
  if (clone.supabase && typeof clone.supabase === 'object') {
    // The anon key is safe to expose, but drop anything else that might
    // appear in the future.
    const s = clone.supabase as Record<string, unknown>
    delete s.serviceRoleKey
  }
  return clone
}
