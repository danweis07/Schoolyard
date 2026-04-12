import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppState } from '../hooks/useAppState'
import { getSupabase } from '../lib/supabase'
import { siteConfig } from '../lib/config'

function resolveSchoolSlug(): string {
  const envSlug = process.env?.EXPO_PUBLIC_SCHOOLYARD_SCHOOL_SLUG
  if (envSlug) return envSlug
  return siteConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!gatewayUrl) return 0

  const slug = resolveSchoolSlug()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const supabase = getSupabase()
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  }

  const res = await fetch(
    `${gatewayUrl}/functions/v1/gateway/inbox/unread-count?school=${encodeURIComponent(slug)}`,
    { method: 'GET', headers, signal },
  )

  if (!res.ok) return 0

  const data = await res.json()
  return typeof data.count === 'number' ? data.count : 0
}

export function useUnreadCount() {
  const queryClient = useQueryClient()

  const query = useQuery<number>({
    queryKey: ['inbox-unread-count'],
    queryFn: ({ signal }) => fetchUnreadCount(signal),
    refetchOnWindowFocus: true,
    // Poll every 60 seconds so badge stays roughly current
    refetchInterval: 60_000,
  })

  // Refetch when app returns to foreground
  useAppState((state) => {
    if (state === 'active') {
      queryClient.invalidateQueries({ queryKey: ['inbox-unread-count'] })
    }
  })

  return query
}
