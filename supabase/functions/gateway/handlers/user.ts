/**
 * User handler — user-scoped actions requiring authentication.
 *
 * RSVP, volunteer hours, push tokens, community flags, listings.
 */

import type { GatewayContext } from '../types.ts'
import { jsonOk, jsonCreated, noContent, jsonError } from '../response.ts'

export async function handleUser(ctx: GatewayContext): Promise<Response> {
  const { req, route, supabase, auth, schoolId, origin } = ctx

  if (!auth) return jsonError(401, 'unauthorized', origin)

  switch (route.resource) {
    case 'rsvp':
      return handleRsvp(ctx)
    case 'rsvps':
      return handleRsvpList(ctx)
    case 'volunteer-hours':
      return handleVolunteerHours(ctx)
    case 'push-token':
      return handlePushToken(ctx)
    case 'flag-listing':
      return handleFlagListing(ctx)
    case 'community-listing':
      return handleCommunityListing(ctx)
    default:
      return jsonError(404, `unknown user resource: ${route.resource}`, origin)
  }
}

async function handleRsvp(ctx: GatewayContext): Promise<Response> {
  const { req, route, supabase, auth, schoolId, origin } = ctx
  const method = req.method.toUpperCase()

  if (method === 'POST') {
    const body = (await req.json()) as {
      event_id: string
      status?: string
      guests?: number
    }
    if (!body.event_id) return jsonError(400, 'event_id required', origin)

    const { data, error } = await supabase
      .from('event_rsvps')
      .upsert(
        {
          event_id: body.event_id,
          school_id: schoolId,
          user_id: auth!.userId,
          status: body.status ?? 'going',
          guests: body.guests ?? 0,
        },
        { onConflict: 'event_id,user_id' },
      )
      .select('id')
      .single()
    if (error) return jsonError(500, error.message, origin)
    return jsonCreated(data, origin)
  }

  if (method === 'DELETE' && route.id) {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('id', route.id)
      .eq('user_id', auth!.userId)
    if (error) return jsonError(500, error.message, origin)
    return noContent(origin)
  }

  return jsonError(405, 'method not allowed', origin)
}

async function handleRsvpList(ctx: GatewayContext): Promise<Response> {
  const { supabase, auth, origin } = ctx
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('id, event_id, school_id, status, guests, created_at')
    .eq('user_id', auth!.userId)
    .order('created_at', { ascending: false })
  if (error) return jsonError(500, error.message, origin)
  return jsonOk(data ?? [], origin)
}

async function handleVolunteerHours(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx
  const method = req.method.toUpperCase()

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('volunteer_hours')
      .select('id, school_id, role_id, hours, served_on, notes, created_at')
      .eq('user_id', auth!.userId)
      .order('served_on', { ascending: false })
    if (error) return jsonError(500, error.message, origin)
    return jsonOk(data ?? [], origin)
  }

  if (method === 'POST') {
    const body = (await req.json()) as {
      role_id?: string
      hours: number
      served_on: string
      notes?: string
    }
    if (!body.hours || !body.served_on) {
      return jsonError(400, 'hours and served_on required', origin)
    }
    const { data, error } = await supabase
      .from('volunteer_hours')
      .insert({
        school_id: schoolId,
        user_id: auth!.userId,
        role_id: body.role_id ?? null,
        hours: body.hours,
        served_on: body.served_on,
        notes: body.notes ?? null,
      })
      .select('id')
      .single()
    if (error) return jsonError(500, error.message, origin)
    return jsonCreated(data, origin)
  }

  return jsonError(405, 'method not allowed', origin)
}

async function handlePushToken(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx
  const body = (await req.json()) as {
    expo_token: string
    platform: string
  }
  if (!body.expo_token || !body.platform) {
    return jsonError(400, 'expo_token and platform required', origin)
  }

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: auth!.userId,
      school_id: schoolId,
      expo_token: body.expo_token,
      platform: body.platform,
    },
    { onConflict: 'expo_token' },
  )
  if (error) return jsonError(500, error.message, origin)
  return noContent(origin)
}

async function handleFlagListing(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx
  const body = (await req.json()) as {
    listing_id: string
    reason: string
  }
  if (!body.listing_id || !body.reason) {
    return jsonError(400, 'listing_id and reason required', origin)
  }

  // Insert the flag row
  const { error: flagErr } = await supabase.from('community_flags').insert({
    listing_id: body.listing_id,
    school_id: schoolId,
    reporter_id: auth!.userId,
    reason: body.reason,
  })
  if (flagErr) return jsonError(500, flagErr.message, origin)

  // Increment the flag count (auto-hides at >= 3)
  const { error: rpcErr } = await supabase.rpc('increment_listing_flag', {
    p_listing: body.listing_id,
  })
  if (rpcErr) return jsonError(500, rpcErr.message, origin)

  return noContent(origin)
}

async function handleCommunityListing(ctx: GatewayContext): Promise<Response> {
  const { req, supabase, auth, schoolId, origin } = ctx
  const body = (await req.json()) as Record<string, unknown>

  body.school_id = schoolId
  body.created_by = auth!.userId

  const { data, error } = await supabase
    .from('community_listings')
    .insert(body)
    .select('id')
    .single()
  if (error) return jsonError(500, error.message, origin)
  return jsonCreated(data, origin)
}
