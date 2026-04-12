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
  forms: 'forms',
  'conference-windows': 'conference_windows',
  'conference-slots': 'conference_slots',
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

  // ── /admin/school — read or update the current school's profile ──
  if (route.resource === 'school') {
    const method = req.method.toUpperCase()

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('schools')
        .select(
          'id, name, short_name, slug, tagline, mascot, address, phone, email, website, ' +
          'grades, founded, enrollment, title_one, timezone, branding, social',
        )
        .eq('id', schoolId)
        .single()
      if (error) return jsonError(500, error.message, origin)
      if (!data) return jsonError(404, 'school not found', origin)
      return jsonOk(data, origin)
    }

    if (method === 'PUT') {
      let body: Record<string, unknown>
      try {
        body = (await req.json()) as Record<string, unknown>
      } catch {
        return jsonError(400, 'invalid json', origin)
      }
      // Strip immutable fields
      delete body.id
      delete body.slug
      delete body.school_id
      delete body.district_id
      delete body.created_at
      delete body.updated_at
      delete body.backend
      delete body.domain
      delete body.path_slug
      delete body.languages
      delete body.modules

      // Merge branding with existing values to preserve keys the wizard doesn't manage
      if (body.branding && typeof body.branding === 'object') {
        const { data: current } = await supabase
          .from('schools')
          .select('branding')
          .eq('id', schoolId)
          .single()
        if (current?.branding) {
          body.branding = { ...current.branding, ...(body.branding as Record<string, unknown>) }
        }
      }

      const { error } = await supabase
        .from('schools')
        .update(body)
        .eq('id', schoolId)
      if (error) return jsonError(500, error.message, origin)
      return noContent(origin)
    }

    return jsonError(405, 'method not allowed', origin)
  }

  // ── /admin/form-responses/{formId} — read responses for a form ──
  if (route.resource === 'form-responses') {
    if (!route.id) return jsonError(400, 'form id required', origin)
    const { data, error } = await supabase
      .from('form_responses')
      .select('id, form_id, user_id, student_name, responses, signature, submitted_at')
      .eq('form_id', route.id)
      .eq('school_id', schoolId)
      .order('submitted_at', { ascending: false })
    if (error) return jsonError(500, error.message, origin)
    return jsonOk(data ?? [], origin)
  }

  // ── /admin/form-reminder — send push to non-submitters ─────────
  if (route.resource === 'form-reminder') {
    return handleFormReminder(ctx)
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

// ── Form reminder — push notification to non-submitters ──────────

async function handleFormReminder(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, origin } = ctx

  let body: { form_id: string }
  try {
    body = (await req.json()) as { form_id: string }
  } catch {
    return jsonError(400, 'invalid json', origin)
  }

  if (!body.form_id) return jsonError(400, 'form_id required', origin)

  // Find push tokens for users who haven't submitted this form
  const { data: tokens, error: tokenErr } = await supabase
    .from('push_tokens')
    .select('expo_token, user_id')
    .eq('school_id', schoolId)
    .not(
      'user_id',
      'in',
      `(select distinct user_id from form_responses where form_id = '${body.form_id}')`,
    )

  if (tokenErr) return jsonError(500, tokenErr.message, origin)
  if (!tokens || tokens.length === 0) return jsonOk({ sent: 0 }, origin)

  // Get form title for the notification
  const { data: form } = await supabase
    .from('forms')
    .select('title')
    .eq('id', body.form_id)
    .maybeSingle()

  const title = form?.title ?? 'Form Reminder'

  // Fan out push notifications (best-effort, fire-and-forget)
  const messages = tokens
    .filter((t: { expo_token: string }) => t.expo_token)
    .map((t: { expo_token: string }) => ({
      to: t.expo_token,
      title: 'Form Reminder',
      body: `Please complete: ${title}`,
      sound: 'default' as const,
    }))

  if (messages.length > 0) {
    const batches = []
    for (let i = 0; i < messages.length; i += 100) {
      batches.push(messages.slice(i, i + 100))
    }
    // Fire-and-forget to Expo Push API
    for (const batch of batches) {
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      }).catch(() => {})
    }
  }

  return jsonOk({ sent: messages.length }, origin)
}
