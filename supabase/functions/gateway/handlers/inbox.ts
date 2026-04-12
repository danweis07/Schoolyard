/**
 * Inbox handler — in-app notification inbox for parents.
 *
 * Authenticated users see their inbox with read/pin/archive state.
 * Guest mode falls back to public sent notifications (no inbox state).
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonError } from '../response.ts'

export async function handleInbox(ctx: GatewayContext): Promise<Response> {
  const { route, origin } = ctx

  switch (route.resource) {
    case 'inbox':
      return ctx.req.method === 'GET' ? listInbox(ctx) : jsonError(405, 'method not allowed', origin)
    case 'unread-count':
      return getUnreadCount(ctx)
    default:
      if (route.id) return updateInboxItem(ctx)
      return jsonError(404, `unknown inbox resource: ${route.resource}`, origin)
  }
}

async function listInbox(ctx: GatewayContext): Promise<Response> {
  const { supabase, auth, schoolId, origin } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  const url = new URL(ctx.req.url)
  const archived = url.searchParams.get('archived') === 'true'

  const { data, error } = await supabase
    .from('notification_inbox')
    .select(`
      id,
      read,
      pinned,
      archived,
      created_at,
      notification_id,
      notifications!inner (
        id,
        title,
        body_text,
        body_html,
        image_url,
        urgency,
        topic,
        sent_at
      )
    `)
    .eq('user_id', auth.userId)
    .eq('school_id', schoolId)
    .eq('archived', archived)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return jsonError(500, error.message, origin)

  // Flatten the join
  const items = (data ?? []).map((row: Record<string, unknown>) => {
    const n = row.notifications as Record<string, unknown> | null
    return {
      id: row.id,
      notification_id: row.notification_id,
      title: n?.title ?? '',
      body_text: n?.body_text ?? '',
      body_html: n?.body_html ?? null,
      image_url: n?.image_url ?? null,
      urgency: n?.urgency ?? 'routine',
      topic: n?.topic ?? null,
      sent_at: n?.sent_at ?? null,
      read: row.read,
      pinned: row.pinned,
      archived: row.archived,
      created_at: row.created_at,
    }
  })

  return jsonOk(items, origin)
}

async function getUnreadCount(ctx: GatewayContext): Promise<Response> {
  const { supabase, auth, schoolId, origin } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  const { count, error } = await supabase
    .from('notification_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .eq('school_id', schoolId)
    .eq('read', false)
    .eq('archived', false)

  if (error) return jsonError(500, error.message, origin)

  return jsonOk({ unread: count ?? 0 }, origin)
}

async function updateInboxItem(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, origin, route } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)
  if (req.method !== 'PUT') return jsonError(405, 'method not allowed', origin)

  const body = (await req.json()) as {
    read?: boolean
    pinned?: boolean
    archived?: boolean
  }

  const patch: Record<string, unknown> = {}
  if (body.read !== undefined) patch.read = body.read
  if (body.pinned !== undefined) patch.pinned = body.pinned
  if (body.archived !== undefined) patch.archived = body.archived

  if (Object.keys(patch).length === 0) {
    return jsonError(400, 'no fields to update', origin)
  }

  const { error } = await supabase
    .from('notification_inbox')
    .update(patch)
    .eq('id', route.id!)
    .eq('user_id', auth.userId)

  if (error) return jsonError(500, error.message, origin)

  return jsonOk({ updated: true }, origin)
}
