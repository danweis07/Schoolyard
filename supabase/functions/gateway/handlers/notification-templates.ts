/**
 * Notification templates handler — pre-written template library.
 *
 * Public read (templates are visible to see what messages look like).
 * Editor write (create/update/delete templates).
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonCreated, noContent, jsonError } from '../response.ts'

export async function handleNotificationTemplates(ctx: GatewayContext): Promise<Response> {
  const { req, route, supabase, auth, schoolId, origin } = ctx
  const method = req.method.toUpperCase()

  // List or create
  if (!route.id) {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('id, slug, title, body_text, body_html, urgency, topic, locale_versions, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) return jsonError(500, error.message, origin)
      return jsonOk(data ?? [], origin)
    }

    if (method === 'POST') {
      if (!auth) return jsonError(401, 'unauthorized', origin)

      const body = (await req.json()) as {
        slug: string
        title: string
        body_text: string
        body_html?: string
        urgency?: string
        topic?: string
        locale_versions?: Record<string, { title: string; body: string }>
      }

      if (!body.slug || !body.title || !body.body_text) {
        return jsonError(400, 'slug, title, and body_text required', origin)
      }

      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          school_id: schoolId,
          slug: body.slug,
          title: body.title,
          body_text: body.body_text,
          body_html: body.body_html ?? null,
          urgency: body.urgency ?? 'routine',
          topic: body.topic ?? null,
          locale_versions: body.locale_versions ?? {},
          created_by: auth.userId,
        })
        .select('id')
        .single()

      if (error) return jsonError(500, error.message, origin)
      return jsonCreated(data, origin)
    }

    return jsonError(405, 'method not allowed', origin)
  }

  // Single template operations
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', route.id)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (error) return jsonError(500, error.message, origin)
    if (!data) return jsonError(404, 'template not found', origin)
    return jsonOk(data, origin)
  }

  if (method === 'PUT') {
    if (!auth) return jsonError(401, 'unauthorized', origin)

    const body = (await req.json()) as Record<string, unknown>

    const { error } = await supabase
      .from('notification_templates')
      .update(body)
      .eq('id', route.id)
      .eq('school_id', schoolId)

    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  if (method === 'DELETE') {
    if (!auth) return jsonError(401, 'unauthorized', origin)

    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', route.id)
      .eq('school_id', schoolId)

    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  return jsonError(405, 'method not allowed', origin)
}
