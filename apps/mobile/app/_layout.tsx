import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { validateSupabaseEnv } from '@schoolyard/config'
import { AppProviders } from './providers'
import { registerForPushNotifications } from '../lib/notifications'
import { siteConfig } from '../lib/config'
import '../global.css'

// Fail fast if Supabase env vars are missing in supabase backend mode.
const backendMode = process.env.EXPO_PUBLIC_SCHOOLYARD_BACKEND ?? 'supabase'
if (backendMode === 'supabase') {
  const envResult = validateSupabaseEnv({
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  })
  if (!envResult.valid) {
    console.error(
      `[Schoolyard] Missing env vars for supabase backend: ${envResult.missing.join(', ')}. ` +
        `Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.`,
    )
  }
}

function useRegisterPush() {
  useEffect(() => {
    const schoolSlug = siteConfig.school.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    registerForPushNotifications(schoolSlug).catch(() => {
      // Silent failure — push is optional. Registration will retry next launch.
    })
  }, [])
}

export default function RootLayout() {
  useRegisterPush()

  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </SafeAreaProvider>
  )
}
