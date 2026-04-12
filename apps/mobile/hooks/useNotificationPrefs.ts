import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import { siteConfig } from '../lib/config'

export interface NotificationChannel {
  push: boolean
  email: boolean
  sms: boolean
}

export interface TopicPreference {
  topic: string
  label: string
  enabled: boolean
}

export interface NotificationPrefs {
  channels: NotificationChannel
  topics: TopicPreference[]
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

async function fetchPrefs(signal?: AbortSignal): Promise<NotificationPrefs> {
  const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!gatewayUrl) throw new Error('gateway URL not configured')

  const slug = resolveSchoolSlug()
  const headers = await getAuthHeaders()

  const res = await fetch(
    `${gatewayUrl}/functions/v1/gateway/notification-prefs?school=${encodeURIComponent(slug)}`,
    { method: 'GET', headers, signal },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch notification prefs (${res.status}): ${text}`)
  }

  return res.json()
}

async function updatePrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
  const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!gatewayUrl) throw new Error('gateway URL not configured')

  const slug = resolveSchoolSlug()
  const headers = await getAuthHeaders()

  const res = await fetch(
    `${gatewayUrl}/functions/v1/gateway/notification-prefs?school=${encodeURIComponent(slug)}`,
    { method: 'PUT', headers, body: JSON.stringify(prefs) },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update notification prefs (${res.status}): ${text}`)
  }

  return res.json()
}

export function useNotificationPrefs() {
  return useQuery<NotificationPrefs>({
    queryKey: ['notification-prefs'],
    queryFn: ({ signal }) => fetchPrefs(signal),
  })
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePrefs,
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-prefs'], data)
    },
  })
}
