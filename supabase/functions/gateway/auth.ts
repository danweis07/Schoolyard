/**
 * Auth verification and role resolution for the gateway.
 *
 * - Extracts the Bearer token from the Authorization header
 * - Verifies it via supabase.auth.getUser()
 * - Resolves the user's profile (role + school_id)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AuthContext, AuthLevel } from './types.ts'

/**
 * Verify the caller's identity and resolve their role.
 * Returns null if the token is missing or invalid.
 */
export async function verifyAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Use the anon key + user's token to verify identity through RLS
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()
  if (error || !user) return null

  // Resolve profile for role + school assignment
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role, school_id, district_id')
    .eq('id', user.id)
    .maybeSingle()

  return {
    userId: user.id,
    role: (profile?.role as string) ?? 'member',
    schoolId: (profile?.school_id as string) ?? null,
    districtId: (profile?.district_id as string) ?? null,
  }
}

/**
 * Check whether an AuthContext satisfies the required auth level
 * for a given school.
 */
export function satisfiesAuthLevel(
  auth: AuthContext | null,
  level: AuthLevel,
  targetSchoolId?: string,
): boolean {
  if (level === 'none' || level === 'stripe-sig') return true
  if (!auth) return false

  if (level === 'member') return true

  // For editor/admin levels, the user must belong to the target school
  // (or be a district_admin whose district owns the school)
  const schoolMatch = auth.schoolId === targetSchoolId

  if (level === 'editor') {
    return (
      schoolMatch && ['editor', 'admin', 'district_admin'].includes(auth.role)
    )
  }

  if (level === 'admin') {
    return schoolMatch && ['admin', 'district_admin'].includes(auth.role)
  }

  return false
}
