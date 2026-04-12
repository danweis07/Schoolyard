/**
 * School slug → UUID resolution with in-memory cache.
 *
 * Used by every handler that needs a school_id from a slug.
 * The cache lives for the lifetime of the edge function instance.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SchoolRow {
  id: string
  slug: string
  name: string
  short_name: string | null
  branding: Record<string, unknown>
  languages: Record<string, unknown>
  modules: Record<string, unknown>
  district_id: string | null
}

const cache = new Map<string, SchoolRow>()

export async function resolveSchool(
  supabase: SupabaseClient,
  slug: string,
): Promise<SchoolRow | null> {
  const cached = cache.get(slug)
  if (cached) return cached

  const { data, error } = await supabase
    .from('schools')
    .select('id, slug, name, short_name, branding, languages, modules, district_id')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  cache.set(slug, data as SchoolRow)
  return data as SchoolRow
}

export function getSchoolFromRequest(req: Request): string | null {
  const url = new URL(req.url)
  return (
    url.searchParams.get('school') ??
    req.headers.get('x-school-slug') ??
    null
  )
}
