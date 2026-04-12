/**
 * Content handler — public reads for all 14 content collections.
 *
 * No auth required. Returns column-filtered responses that strip PII.
 * Row-to-shape mapping logic is ported from
 * packages/content-api/src/adapters/supabase.ts.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError } from '../response.ts'
import { PUBLIC_SELECT } from '../column-filters.ts'

export async function handleContent(ctx: GatewayContext): Promise<Response> {
  const { supabase, route, schoolId, origin } = ctx

  switch (route.resource) {
    case 'manifest':
      return handleManifest(ctx)
    case 'config':
      return handleConfig(ctx)
    case 'counts':
      return handleCounts(ctx)
    case 'events':
      return handleCollection(ctx, 'events', { published: true }, 'starts_at', true)
    case 'news':
      return handleCollection(ctx, 'news', { published: true }, 'published_at', false)
    case 'board':
      return handleCollection(ctx, 'board_members', {}, 'sort_order', true)
    case 'volunteers':
      return handleCollection(ctx, 'volunteer_roles', {}, 'sort_order', true)
    case 'resources':
      return handleCollection(ctx, 'resources', {}, 'name', true)
    case 'lunch-menus':
      return handleCollection(ctx, 'lunch_menus', {}, 'week_of', false)
    case 'transportation':
      return handleCollection(ctx, 'transportation_routes', {}, 'sort_order', true)
    case 'community':
      return handleCollection(ctx, 'community_listings', { hidden: false }, 'sort_order', true)
    case 'teachers':
      return handleCollection(ctx, 'classroom_teachers', {}, 'sort_order', true)
    case 'budget':
      return handleCollection(ctx, 'budget_years', {}, 'year', false)
    case 'committees':
      return handleCollection(ctx, 'committees', {}, 'sort_order', true)
    case 'programs':
      return handleCollection(ctx, 'programs', {}, 'sort_order', true)
    case 'newsletters':
      return handleCollection(ctx, 'pta_newsletters', {}, 'published_at', false)
    case 'announcements':
      return handleAnnouncements(ctx)
    default:
      return jsonError(404, `unknown content resource: ${route.resource}`, origin)
  }
}

// ── Generic collection handler ───────────────────────────────────

async function handleCollection(
  ctx: GatewayContext,
  table: string,
  filters: Record<string, unknown>,
  orderBy: string,
  ascending: boolean,
): Promise<Response> {
  const { supabase, schoolId, origin } = ctx
  const selectCols = PUBLIC_SELECT[table] ?? '*'

  let query = supabase
    .from(table)
    .select(selectCols)
    .eq('school_id', schoolId)
    .order(orderBy, { ascending })

  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val)
  }

  const { data, error } = await query
  if (error) return jsonError(500, error.message, origin)
  return jsonOk(data ?? [], origin)
}

// ── Manifest ─────────────────────────────────────────────────────

async function handleManifest(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin } = ctx

  // Fetch school info
  const { data: school } = await supabase
    .from('schools')
    .select('name, short_name, branding, languages, modules, district_id')
    .eq('id', schoolId)
    .single()

  if (!school) return jsonError(404, 'school not found', origin)

  const languages = (school.languages ?? {}) as { supported?: string[] }
  const modules = (school.modules ?? {}) as Record<string, boolean>

  // Counts
  const tables = ['events', 'news', 'board_members', 'volunteer_roles', 'resources'] as const
  const countResults = await Promise.all(
    tables.map((t) =>
      supabase.from(t).select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    ),
  )
  const [events, news, board, volunteers, resources] = countResults.map((r) => r.count ?? 0)

  return jsonOk(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      tenantMode: school.district_id ? 'district' : 'single',
      tenantSlug: school.district_id ? ctx.schoolSlug : '',
      school: {
        name: school.name,
        shortName: school.short_name ?? school.name,
        mascot: '',
        tagline: '',
        district: '',
        timezone: '',
      },
      locales: languages.supported ?? ['en'],
      enabledModules: Object.entries(modules)
        .filter(([, v]) => v === true)
        .map(([k]) => k),
      counts: { events, news, board, volunteers, resources },
    },
    origin,
  )
}

// ── Config ───────────────────────────────────────────────────────

async function handleConfig(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin } = ctx

  const { data: school } = await supabase
    .from('schools')
    .select('name, short_name, branding, languages, modules')
    .eq('id', schoolId)
    .single()

  if (!school) return jsonError(404, 'school not found', origin)

  return jsonOk(
    {
      school: { name: school.name, shortName: school.short_name ?? school.name },
      branding: school.branding,
      languages: school.languages,
      modules: school.modules,
    },
    origin,
  )
}

// ── Counts ───────────────────────────────────────────────────────

async function handleCounts(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin } = ctx

  const tables = [
    'events',
    'news',
    'board_members',
    'volunteer_roles',
    'resources',
    'announcements',
    'lunch_menus',
    'transportation_routes',
    'community_listings',
    'classroom_teachers',
    'budget_years',
    'committees',
    'programs',
    'pta_newsletters',
  ] as const

  const results = await Promise.all(
    tables.map((t) =>
      supabase.from(t).select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    ),
  )

  const counts: Record<string, number> = {}
  for (let i = 0; i < tables.length; i++) {
    counts[tables[i]] = results[i].count ?? 0
  }

  return jsonOk(counts, origin)
}

// ── Announcements (special: filter on sent_at) ───────────────────

async function handleAnnouncements(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin } = ctx
  const selectCols = PUBLIC_SELECT['announcements'] ?? '*'

  const { data, error } = await supabase
    .from('announcements')
    .select(selectCols)
    .eq('school_id', schoolId)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })

  if (error) return jsonError(500, error.message, origin)
  return jsonOk(data ?? [], origin)
}
