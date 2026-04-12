/**
 * OneSignal integration with Expo push fallback.
 *
 * If the school's config includes a `onesignalAppId`, the OneSignal SDK is
 * initialized for richer push features (segments, tags, in-app messages).
 * Otherwise we fall back to native Expo push notifications.
 *
 * Uses the same lazy dynamic import pattern as `notifications.ts` — the
 * `react-native-onesignal` package is optional. Install when ready:
 *
 *   pnpm --filter mobile add react-native-onesignal
 */

interface OneSignalSDK {
  initialize: (appId: string) => void
  login: (externalId: string) => void
  User: {
    addTag: (key: string, value: string) => void
    addTags: (tags: Record<string, string>) => void
  }
}

let oneSignalInstance: OneSignalSDK | null = null
let initialized = false

async function loadOneSignal(): Promise<OneSignalSDK | null> {
  try {
    // @ts-expect-error — optional dep. Typechecks clean when absent.
    const mod = await import('react-native-onesignal')
    return (mod.default ?? mod) as OneSignalSDK
  } catch {
    return null
  }
}

export interface NotificationConfig {
  onesignalAppId?: string
}

/**
 * Initialize push notifications.
 *
 * - If `config.onesignalAppId` is set, loads and initializes OneSignal.
 * - Otherwise returns false so the caller can fall back to Expo push.
 *
 * Returns `true` if OneSignal was initialized, `false` otherwise.
 */
export async function initializeNotifications(config: NotificationConfig): Promise<boolean> {
  if (initialized) return oneSignalInstance !== null

  if (!config.onesignalAppId) {
    initialized = true
    return false
  }

  const sdk = await loadOneSignal()
  if (!sdk) {
    initialized = true
    return false
  }

  sdk.initialize(config.onesignalAppId)
  oneSignalInstance = sdk
  initialized = true
  return true
}

/**
 * Sync user-level tags to OneSignal for targeted notifications.
 * No-ops silently if OneSignal is not active.
 */
export function syncUserTags(
  userId: string,
  schoolId: string,
  grade?: string,
): void {
  if (!oneSignalInstance) return

  oneSignalInstance.login(userId)

  const tags: Record<string, string> = { school_id: schoolId }
  if (grade) {
    tags.grade = grade
  }
  oneSignalInstance.User.addTags(tags)
}

/**
 * Returns true if OneSignal was successfully initialized.
 */
export function isOneSignalActive(): boolean {
  return oneSignalInstance !== null
}
