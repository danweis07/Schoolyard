#!/usr/bin/env tsx
/**
 * Markdown → Supabase seeder.
 *
 * Reads school.config.json and the Astro content collections under
 * apps/web/src/content/ and upserts the normalized rows into a live
 * Supabase project. Uses the service role key to bypass RLS.
 *
 * Usage:
 *
 *   pnpm migrate:supabase                     # migrate the default school
 *   pnpm migrate:supabase --school=longfellow # one school in district mode
 *   pnpm migrate:supabase --dry-run           # parse + report, no writes
 *   pnpm migrate:supabase --collections=events,news
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to re-run: upserts are keyed on (school_id, slug), so the tool
 * is idempotent. Does NOT delete rows that disappeared from the source
 * tree unless `--force` is passed, in which case each collection is
 * TRUNCATE-like (delete-then-insert) for the specified school.
 */
import { resolve, dirname, join, existsSync } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDistrictMode, resolveTenantConfig, getTenantSlugs } from '@schoolyard/config'
import { loadSchoolConfigSync } from '@schoolyard/config/loader'
import type { SchoolConfig } from '@schoolyard/config'
import { createServiceClient, type Database } from '@schoolyard/supabase'
import type { SupabaseClient } from '@schoolyard/supabase'
import {
  readMarkdownCollection,
  normalizeEvent,
  normalizeNews,
  normalizeBoard,
  normalizeVolunteer,
  normalizeResource,
  normalizeLunchMenu,
  normalizeTransportationRoute,
  normalizeCommunityListing,
  normalizeClassroomTeacher,
  normalizeBudgetYear,
  normalizeCommittee,
  normalizeProgram,
} from './lib/normalizers.js'

type Tables = Database['public']['Tables']

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(here, '..')
const WEB_CONTENT = resolve(REPO_ROOT, 'apps/web/src/content')

const ALL_COLLECTIONS = [
  'events',
  'news',
  'board',
  'volunteers',
  'resources',
  'lunch',
  'transportation',
  'community',
  'classroom',
  'budget',
  'committees',
  'programs',
] as const
type CollectionName = (typeof ALL_COLLECTIONS)[number]

interface CliOptions {
  school?: string
  collections: Set<CollectionName>
  dryRun: boolean
  force: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    collections: new Set(ALL_COLLECTIONS),
    dryRun: false,
    force: false,
  }
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--force') options.force = true
    else if (arg.startsWith('--school=')) options.school = arg.slice('--school='.length)
    else if (arg.startsWith('--collections=')) {
      const list = arg
        .slice('--collections='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as CollectionName[]
      options.collections = new Set(list)
    } else if (arg.startsWith('--')) {
      console.error(`Unknown flag: ${arg}`)
      process.exit(2)
    }
  }
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const rootConfig = loadSchoolConfigSync()

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let client: SupabaseClient<Database> | null = null
  if (!options.dryRun) {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        'migrate-to-supabase: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n' +
          'Re-run with --dry-run to parse without writing.',
      )
      process.exit(2)
    }
    client = createServiceClient({ url: supabaseUrl, serviceRoleKey })
  }

  const schoolsToProcess: Array<{
    slug: string
    config: SchoolConfig
    contentDir: string
  }> = []

  if (!isDistrictMode(rootConfig)) {
    const slug =
      options.school ?? rootConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    schoolsToProcess.push({ slug, config: rootConfig, contentDir: WEB_CONTENT })
  } else {
    const allSlugs = getTenantSlugs(rootConfig)
    const filter = options.school ? [options.school] : allSlugs
    for (const slug of filter) {
      if (!allSlugs.includes(slug)) {
        console.error(`School "${slug}" not found in district config`)
        process.exit(2)
      }
      const tenantContent = join(WEB_CONTENT, 'schools', slug)
      schoolsToProcess.push({
        slug,
        config: resolveTenantConfig(rootConfig, slug),
        contentDir: existsSync(tenantContent) ? tenantContent : WEB_CONTENT,
      })
    }
  }

  for (const school of schoolsToProcess) {
    console.log(`\n📥 Migrating ${school.config.school.name} (slug=${school.slug})`)
    if (options.dryRun) {
      await processSchool(null, school, options)
    } else {
      await processSchool(client!, school, options)
    }
  }

  console.log('\n✅ Migration complete.')
}

interface SchoolPlan {
  slug: string
  config: SchoolConfig
  contentDir: string
}

async function processSchool(
  client: SupabaseClient<Database> | null,
  school: SchoolPlan,
  options: CliOptions,
): Promise<void> {
  const schoolId = await upsertSchool(client, school)

  for (const collection of ALL_COLLECTIONS) {
    if (!options.collections.has(collection)) continue
    await migrateCollection(client, schoolId, school, collection, options)
  }
}

async function upsertSchool(
  client: SupabaseClient<Database> | null,
  school: SchoolPlan,
): Promise<string> {
  const row: Tables['schools']['Insert'] = {
    slug: school.slug,
    name: school.config.school.name,
    short_name: school.config.school.shortName,
    branding: school.config.branding as unknown as Record<string, unknown>,
    languages: school.config.languages as unknown as Record<string, unknown>,
    modules: school.config.modules as unknown as Record<string, unknown>,
    backend: 'supabase',
  }

  if (!client) {
    console.log(`  [dry-run] would upsert schools row: ${school.slug}`)
    return 'dry-run'
  }

  const { data, error } = await client
    .from('schools')
    .upsert(row, { onConflict: 'slug' })
    .select('id')
    .single()

  if (error) throw error
  if (!data) throw new Error(`failed to upsert school ${school.slug}`)
  return data.id as string
}

async function migrateCollection(
  client: SupabaseClient<Database> | null,
  schoolId: string,
  school: SchoolPlan,
  collection: CollectionName,
  options: CliOptions,
): Promise<void> {
  const dir = join(school.contentDir, collectionDir(collection))
  const raw = readMarkdownCollection(dir)

  if (raw.length === 0) {
    console.log(`  · ${collection}: 0 items (skipped)`)
    return
  }

  const table = tableFor(collection)

  if (options.force && client) {
    const { error } = await client.from(table).delete().eq('school_id', schoolId)
    if (error) throw error
  }

  const rows = raw.map((item) => mapRow(collection, item, schoolId))
  if (!client) {
    console.log(`  · ${collection}: ${rows.length} items [dry-run]`)
    return
  }

  // Supabase's typed upsert returns `never` when it can't infer the
  // specific table from a dynamic string. Cast through `any` here —
  // we've validated the shape via `mapRow` above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client.from(table) as any).upsert(rows, {
    onConflict: 'school_id,slug',
  })
  if (error) {
    throw new Error(`${collection} upsert failed: ${error.message}`)
  }
  console.log(`  · ${collection}: ${rows.length} items upserted`)
}

function collectionDir(collection: CollectionName): string {
  switch (collection) {
    case 'events':
      return 'events'
    case 'news':
      return 'news'
    case 'board':
      return 'board'
    case 'volunteers':
      return 'volunteers'
    case 'resources':
      return 'resources'
    case 'lunch':
      return 'lunchMenus'
    case 'transportation':
      return 'transportationRoutes'
    case 'community':
      return 'communityListings'
    case 'classroom':
      return 'classroomTeachers'
    case 'budget':
      return 'budgetYears'
    case 'committees':
      return 'committees'
    case 'programs':
      return 'programs'
  }
}

function tableFor(collection: CollectionName): keyof Tables {
  switch (collection) {
    case 'events':
      return 'events'
    case 'news':
      return 'news'
    case 'board':
      return 'board_members'
    case 'volunteers':
      return 'volunteer_roles'
    case 'resources':
      return 'resources'
    case 'lunch':
      return 'lunch_menus'
    case 'transportation':
      return 'transportation_routes'
    case 'community':
      return 'community_listings'
    case 'classroom':
      return 'classroom_teachers'
    case 'budget':
      return 'budget_years'
    case 'committees':
      return 'committees'
    case 'programs':
      return 'programs'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(collection: CollectionName, item: any, schoolId: string): Record<string, unknown> {
  switch (collection) {
    case 'events': {
      const n = normalizeEvent(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        title: n.title,
        description: n.description,
        body_md: item.rawBody,
        body_html: n.htmlBody,
        starts_at: n.date,
        ends_at: n.endDate,
        location: n.location,
        category: n.category,
        capacity: null,
        rsvp_enabled: false,
        featured: n.featured,
        cancelled: n.cancelled,
        published: true,
      }
    }
    case 'news': {
      const n = normalizeNews(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        title: n.title,
        excerpt: n.summary,
        body_md: item.rawBody,
        body_html: n.htmlBody,
        author: n.author,
        tags: n.tags,
        image: n.image,
        image_alt: n.imageAlt,
        published_at: n.publishDate,
        featured: n.featured,
        published: true,
      }
    }
    case 'board': {
      const n = normalizeBoard(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        name: n.name,
        role: n.role,
        bio_md: n.bio,
        bio_html: n.htmlBody,
        email: n.email,
        photo_url: n.photo,
        term_start: n.termStart,
        term_end: n.termEnd,
        sort_order: n.order,
      }
    }
    case 'volunteers': {
      const n = normalizeVolunteer(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        title: n.title,
        description_md: n.description,
        description_html: n.htmlBody,
        commitment: n.commitment,
        capacity: null,
        filled: n.filled ? 1 : 0,
        contact_email: n.contact,
        sort_order: n.order,
      }
    }
    case 'resources': {
      const n = normalizeResource(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        name: n.name,
        category: n.category,
        description: n.description,
        address: n.address,
        phone: n.phone,
        url: n.url,
        languages: n.languages,
      }
    }
    case 'lunch': {
      const n = normalizeLunchMenu(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        week_of: n.weekOf,
        week_end: n.weekEnd,
        meals: n.meals,
        allergens: n.allergens,
        free_reduced_note: n.freeReducedNote,
        pdf_url: n.pdfUrl,
      }
    }
    case 'transportation': {
      const n = normalizeTransportationRoute(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        route_number: n.routeNumber,
        route_name: n.routeName,
        driver: n.driver,
        morning_arrival: n.morningArrival,
        afternoon_departure: n.afternoonDeparture,
        stops: n.stops,
        notes: n.notes,
        sort_order: n.order,
      }
    }
    case 'community': {
      const n = normalizeCommunityListing(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        title: n.title,
        category: n.category,
        description: n.description,
        contact: n.contact,
        neighborhood: n.neighborhood,
        posted_date: n.postedDate,
        expires_date: n.expiresDate,
        url: n.url,
        sort_order: n.order,
      }
    }
    case 'classroom': {
      const n = normalizeClassroomTeacher(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        name: n.name,
        grade: n.grade,
        subject: n.subject,
        email: n.email,
        photo_url: n.photo,
        bio_md: n.bio,
        wishlist: n.wishlist,
        reading_list: n.readingList,
        sort_order: n.order,
      }
    }
    case 'budget': {
      const n = normalizeBudgetYear(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        year: n.year,
        total_raised: n.totalRaised,
        total_spent: n.totalSpent,
        categories: n.categories,
        summary: n.summary,
        sort_order: n.order,
      }
    }
    case 'committees': {
      const n = normalizeCommittee(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        name: n.name,
        icon: n.icon,
        description_md: n.description,
        meets: n.meets,
        members: n.members,
        sort_order: n.order,
      }
    }
    case 'programs': {
      const n = normalizeProgram(item)
      return {
        school_id: schoolId,
        slug: n.slug,
        name: n.name,
        grades: n.grades,
        schedule: n.schedule,
        description_md: n.description,
        funding: n.funding,
        partner: n.partner,
        goal_cents: n.goalCents,
        raised_cents: n.raisedCents,
        sort_order: n.order,
      }
    }
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:')
  console.error(err instanceof Error ? err.stack : String(err))
  process.exit(1)
})
