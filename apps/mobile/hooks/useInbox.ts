import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppState } from '../hooks/useAppState'
import { getSupabase } from '../lib/supabase'
import { siteConfig } from '../lib/config'

export interface InboxItem {
  id: string
  title: string
  body: string
  timestamp: string
  read: boolean
  pinned: boolean
  archived: boolean
  urgency: 'normal' | 'urgent'
  topic?: string
}

function resolveSchoolSlug(): string {
  const envSlug = process.env?.EXPO_PUBLIC_SCHOOLYARD_SCHOOL_SLUG
  if (envSlug) return envSlug
  return siteConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

async function getAuthHeaders(): Promise<Record<string, string>> {
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
  return headers
}

async function fetchInbox(signal?: AbortSignal): Promise<InboxItem[]> {
  const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!gatewayUrl) throw new Error('gateway URL not configured')

  const slug = resolveSchoolSlug()
  const headers = await getAuthHeaders()

  const res = await fetch(
    `${gatewayUrl}/functions/v1/gateway/inbox?school=${encodeURIComponent(slug)}`,
    { method: 'GET', headers, signal },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch inbox (${res.status}): ${text}`)
  }

  return res.json()
}

export function useInbox() {
  const queryClient = useQueryClient()

  const query = useQuery<InboxItem[]>({
    queryKey: ['inbox'],
    queryFn: ({ signal }) => fetchInbox(signal),
    refetchOnWindowFocus: true,
  })

  // Refetch when app returns to foreground
  useAppState((state) => {
    if (state === 'active') {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
    }
  })

  return query
}

// ── Mutations ───────────────────────────────────────────────────────

async function patchInboxItem(
  id: string,
  patch: Partial<Pick<InboxItem, 'read' | 'pinned' | 'archived'>>,
): Promise<void> {
  const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!gatewayUrl) throw new Error('gateway URL not configured')

  const slug = resolveSchoolSlug()
  const headers = await getAuthHeaders()

  const res = await fetch(
    `${gatewayUrl}/functions/v1/gateway/inbox/${encodeURIComponent(id)}?school=${encodeURIComponent(slug)}`,
    { method: 'PATCH', headers, body: JSON.stringify(patch) },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update inbox item (${res.status}): ${text}`)
  }
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patchInboxItem(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-unread-count'] })
    },
  })
}

export function useTogglePin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      patchInboxItem(id, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}

export function useArchiveItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patchInboxItem(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-unread-count'] })
    },
  })
}
