/**
 * Admin handler — authenticated CRUD for all content tables.
 *
 * Requires editor/admin role (enforced at the gateway level).
 * Returns full rows including PII columns since the user is role-verified.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonCreated, noContent, jsonError } from '../response.ts'

/** Tables that admin CRUD supports, mapped to their Postgres table name. */
const TABLE_MAP: Record<string, string> = {
  events: 'events',
  news: 'news',
  board: 'board_members',
  volunteers: 'volunteer_roles',
  resources: 'resources',
  'lunch-menus': 'lunch_menus',
  transportation: 'transportation_routes',
  community: 'community_listings',
  teachers: 'classroom_teachers',
  budget: 'budget_years',
  committees: 'committees',
  programs: 'programs',
  newsletters: 'pta_newsletters',
  announcements: 'announcements',
}

export async function handleAdmin(ctx: GatewayContext): Promise<Response> {
  const { req, route, supabase, auth, schoolId, origin } = ctx

  // ── /admin/profile — return current user's profile ─────────────
  if (route.resource === 'profile') {
    if (!auth) return jsonError(401, 'unauthorized', origin)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, school_id, district_id')
      .eq('id', auth.userId)
      .maybeSingle()
    if (error) return jsonError(500, error.message, origin)
    if (!data) return jsonError(404, 'profile not found', origin)
    return jsonOk(data, origin)
  }

  // ── /admin/counts — dashboard counts (incl. unpublished) ───────
  if (route.resource === 'counts') {
    const tables = [
      'events',
      'news',
      'board_members',
      'volunteer_roles',
      'resources',
      'announcements',
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

  // ── CRUD on content tables ─────────────────────────────────────
  const pgTable = TABLE_MAP[route.resource]
  if (!pgTable) {
    return jsonError(404, `unknown admin resource: ${route.resource}`, origin)
  }

  const method = req.method.toUpperCase()

  // GET list
  if (method === 'GET' && !route.id) {
    const { data, error } = await supabase
      .from(pgTable)
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
    if (error) return jsonError(500, error.message, origin)
    return jsonOk(data ?? [], origin)
  }

  // GET single
  if (method === 'GET' && route.id) {
    const { data, error } = await supabase
      .from(pgTable)
      .select('*')
      .eq('id', route.id)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (error) return jsonError(500, error.message, origin)
    if (!data) return jsonError(404, 'not found', origin)
    return jsonOk(data, origin)
  }

  // POST create
  if (method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return jsonError(400, 'invalid json', origin)
    }
    body.school_id = schoolId
    const { data, error } = await supabase.from(pgTable).insert(body).select('id').single()
    if (error) return jsonError(500, error.message, origin)
    return jsonCreated(data, origin)
  }

  // PUT update
  if (method === 'PUT' && route.id) {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return jsonError(400, 'invalid json', origin)
    }
    // Prevent changing school_id
    delete body.school_id
    delete body.id
    const { error } = await supabase
      .from(pgTable)
      .update(body)
      .eq('id', route.id)
      .eq('school_id', schoolId)
    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  // DELETE
  if (method === 'DELETE' && route.id) {
    const { error } = await supabase
      .from(pgTable)
      .delete()
      .eq('id', route.id)
      .eq('school_id', schoolId)
    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  return jsonError(405, 'method not allowed', origin)
}
