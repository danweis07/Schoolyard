/**
 * Expo Notifications + Supabase push token registration.
 *
 * Call `registerForPushNotifications(schoolSlug)` once on app launch
 * (e.g. from `app/_layout.tsx` or the first authed tab). It:
 *
 *   1. Requests notification permission (idempotent).
 *   2. Pulls the Expo push token from the device.
 *   3. Upserts a row in `push_tokens` scoped to the current school.
 *
 * Loads `expo-notifications` and `expo-device` lazily via a dynamic
 * import guarded by a try/catch — so typecheck succeeds whether or not
 * those packages are installed yet. Install them when you're ready:
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

  // Look up the school id — we store `school_id` on push_tokens rows
  // so admins can scope announcements. A null user_id means the device
  // opted in without signing in.
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', schoolSlug)
    .maybeSingle<{ id: string }>()
  if (!school) return { token: null, error: `unknown school: ${schoolSlug}` }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await (
    supabase.from('push_tokens') as unknown as {
      upsert: (row: Record<string, unknown>, opts?: { onConflict?: string }) => Promise<unknown>
    }
  ).upsert(
    {
      school_id: school.id,
      user_id: user?.id ?? null,
      expo_token: tokenInfo.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    },
    { onConflict: 'expo_token' },
  )

  return { token: tokenInfo.data, error: null }
}
