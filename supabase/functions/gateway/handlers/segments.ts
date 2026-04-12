/**
 * Segments handler — audience segment CRUD + member management.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonCreated, noContent, jsonError } from '../response.ts'

export async function handleSegments(ctx: GatewayContext): Promise<Response> {
  const { req, route, supabase, schoolId, origin } = ctx
  const method = req.method.toUpperCase()

  // segments/{id}/members or segments/{id}/members/{memberId}
  const url = new URL(req.url)
  const pathAfterGateway = url.pathname.split('/gateway/')[1] ?? ''
  if (pathAfterGateway.includes('/members')) {
    return handleSegmentMembers(ctx)
  }

  // segments (list or create)
  if (!route.id) {
    if (method === 'GET') return listSegments(ctx)
    if (method === 'POST') return createSegment(ctx)
    return jsonError(405, 'method not allowed', origin)
  }

  // segments/{id}
  if (method === 'GET') return getSegment(ctx)
  if (method === 'PUT') return updateSegment(ctx)
  if (method === 'DELETE') return deleteSegment(ctx)

  return jsonError(405, 'method not allowed', origin)
}

async function listSegments(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin } = ctx

  const { data, error } = await supabase
    .from('audience_segments')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) return jsonError(500, error.message, origin)
  return jsonOk(data ?? [], origin)
}

async function createSegment(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx

  const body = (await req.json()) as {
    slug: string
    name: string
    description?: string
    segment_type: string
    segment_value: string
  }

  if (!body.slug || !body.name || !body.segment_type || !body.segment_value) {
    return jsonError(400, 'slug, name, segment_type, and segment_value required', origin)
  }

  const { data, error } = await supabase
    .from('audience_segments')
    .insert({
      school_id: schoolId,
      slug: body.slug,
      name: body.name,
      description: body.description ?? null,
      segment_type: body.segment_type,
      segment_value: body.segment_value,
      created_by: auth?.userId ?? null,
    })
    .select('id')
    .single()

  if (error) return jsonError(500, error.message, origin)
  return jsonCreated(data, origin)
}

async function getSegment(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin, route } = ctx

  const { data, error } = await supabase
    .from('audience_segments')
    .select('*')
    .eq('id', route.id!)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error) return jsonError(500, error.message, origin)
  if (!data) return jsonError(404, 'segment not found', origin)
  return jsonOk(data, origin)
}

async function updateSegment(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, origin, route } = ctx

  const body = (await req.json()) as {
    name?: string
    description?: string
    segment_value?: string
  }

  const { error } = await supabase
    .from('audience_segments')
    .update(body)
    .eq('id', route.id!)
    .eq('school_id', schoolId)

  if (error) return jsonError(500, error.message, origin)
  return noContent(origin)
}

async function deleteSegment(ctx: GatewayContext): Promise<Response> {
  const { supabase, schoolId, origin, route } = ctx

  const { error } = await supabase
    .from('audience_segments')
    .delete()
    .eq('id', route.id!)
    .eq('school_id', schoolId)

  if (error) return jsonError(500, error.message, origin)
  return noContent(origin)
}

async function handleSegmentMembers(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, schoolId, origin, route } = ctx
  const method = req.method.toUpperCase()

  const segmentId = route.id!

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('audience_segment_members')
      .select('id, user_id, contact_id, created_at')
      .eq('segment_id', segmentId)
      .eq('school_id', schoolId)

    if (error) return jsonError(500, error.message, origin)
    return jsonOk(data ?? [], origin)
  }

  if (method === 'POST') {
    const body = (await req.json()) as {
      user_id?: string
      contact_id?: string
    }

    if (!body.user_id && !body.contact_id) {
      return jsonError(400, 'user_id or contact_id required', origin)
    }

    const { data, error } = await supabase
      .from('audience_segment_members')
      .insert({
        segment_id: segmentId,
        school_id: schoolId,
        user_id: body.user_id ?? null,
        contact_id: body.contact_id ?? null,
      })
      .select('id')
      .single()

    if (error) return jsonError(500, error.message, origin)
    return jsonCreated(data, origin)
  }

  if (method === 'DELETE') {
    // Extract member ID from URL: /segments/{segmentId}/members/{memberId}
    const url = new URL(req.url)
    const parts = url.pathname.split('/')
    const memberId = parts[parts.length - 1]

    const { error } = await supabase
      .from('audience_segment_members')
      .delete()
      .eq('id', memberId)
      .eq('segment_id', segmentId)

    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  return jsonError(405, 'method not allowed', origin)
}
