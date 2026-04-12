/**
 * Shared types for the gateway edge function.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Auth levels that the router can require for a route. */
export type AuthLevel = 'none' | 'member' | 'editor' | 'admin' | 'stripe-sig'

/** Resolved user context after auth verification. */
export interface AuthContext {
  userId: string
  role: string
  schoolId: string | null
  districtId: string | null
}

/** Parsed route match from the router. */
export interface RouteMatch {
  handler: string
  resource: string
  id?: string
  auth: AuthLevel
}

/** Context passed to every handler. */
export interface GatewayContext {
  req: Request
  route: RouteMatch
  supabase: SupabaseClient
  auth: AuthContext | null
  schoolSlug: string
  schoolId: string
  origin: string | null
}
