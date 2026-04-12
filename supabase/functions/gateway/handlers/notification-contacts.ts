/**
 * Notification contacts handler — phone-only parent management.
 *
 * Admin-only CRUD for parents who receive SMS without an app account.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonCreated, noContent, jsonError } from '../response.ts'

export async function handleNotificationContacts(ctx: GatewayContext): Promise<Response> {
  const { req, route, supabase, auth, schoolId, origin } = ctx
  const method = req.method.toUpperCase()

  if (!auth) return jsonError(401, 'unauthorized', origin)

  // List or create
  if (!route.id) {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('notification_contacts')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) return jsonError(500, error.message, origin)
      return jsonOk(data ?? [], origin)
    }

    if (method === 'POST') {
      const body = (await req.json()) as {
        phone: string
        name?: string
        email?: string
        locale?: string
      }

      if (!body.phone) return jsonError(400, 'phone required', origin)

      const { data, error } = await supabase
        .from('notification_contacts')
        .insert({
          school_id: schoolId,
          phone: body.phone,
          name: body.name ?? null,
          email: body.email ?? null,
          locale: body.locale ?? 'en',
          created_by: auth.userId,
        })
        .select('id')
        .single()

      if (error) return jsonError(500, error.message, origin)
      return jsonCreated(data, origin)
    }

    return jsonError(405, 'method not allowed', origin)
  }

  // Single contact operations
  if (method === 'PUT') {
    const body = (await req.json()) as {
      phone?: string
      name?: string
      email?: string
      locale?: string
      verified?: boolean
    }

    const { error } = await supabase
      .from('notification_contacts')
      .update(body)
      .eq('id', route.id)
      .eq('school_id', schoolId)

    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  if (method === 'DELETE') {
    const { error } = await supabase
      .from('notification_contacts')
      .delete()
      .eq('id', route.id)
      .eq('school_id', schoolId)

    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  return jsonError(405, 'method not allowed', origin)
}
