/**
 * Expo Notifications + gateway push token registration.
 *
 * Call `registerForPushNotifications(schoolSlug)` once on app launch
 * (e.g. from `app/_layout.tsx` or the first authed tab). It:
 *
 *   1. Requests notification permission (idempotent).
 *   2. Pulls the Expo push token from the device.
 *   3. Registers the token via the gateway edge function.
 *
 * Loads `expo-notifications` lazily via a dynamic import guarded by a
 * try/catch — so typecheck succeeds whether or not the package is
 * installed yet. Install it when you're ready:
 *
 *   pnpm --filter mobile add expo-notifications expo-device
 */
import { getSupabase } from './supabase'
import { Platform } from 'react-native'

interface ExpoNotifications {
  setNotificationHandler: (config: unknown) => void
  getPermissionsAsync: () => Promise<{ status: string }>
  requestPermissionsAsync: () => Promise<{ status: string }>
  getExpoPushTokenAsync: (opts?: { projectId?: string }) => Promise<{ data: string }>
  setNotificationChannelAsync?: (channelId: string, channel: unknown) => Promise<unknown>
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
  try {
    // @ts-expect-error — optional dep. Typechecks clean when absent.
    const mod = (await import('expo-notifications')) as ExpoNotifications
    return mod
  } catch {
    return null
  }
}

async function ensurePermission(notifications: ExpoNotifications): Promise<boolean> {
  const existing = await notifications.getPermissionsAsync()
  if (existing.status === 'granted') return true
  const requested = await notifications.requestPermissionsAsync()
  return requested.status === 'granted'
}

export interface RegisterResult {
  token: string | null
  error: string | null
}

export async function registerForPushNotifications(schoolSlug: string): Promise<RegisterResult> {
  const supabase = getSupabase()
  if (!supabase) return { token: null, error: 'supabase not configured' }

  const notifications = await loadNotifications()
  if (!notifications) {
    return { token: null, error: 'expo-notifications not installed' }
  }

  const granted = await ensurePermission(notifications)
  if (!granted) return { token: null, error: 'permission denied' }

  let tokenInfo: { data: string }
  try {
    tokenInfo = await notifications.getExpoPushTokenAsync()
  } catch (err) {
    return {
      token: null,
      error: err instanceof Error ? err.message : 'failed to get push token',
    }
  }

  // Get the access token for authenticated gateway calls
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  // Register push token via the gateway edge function
  const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!gatewayUrl) return { token: null, error: 'gateway URL not configured' }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(
    `${gatewayUrl}/functions/v1/gateway/user/push-token?school=${encodeURIComponent(schoolSlug)}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        expo_token: tokenInfo.data,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    },
  )

  if (!res.ok) {
    const text = await res.text()
    return { token: null, error: `registration failed (${res.status}): ${text}` }
  }

  return { token: tokenInfo.data, error: null }
}
