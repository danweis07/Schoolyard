import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { validateSupabaseEnv } from '@schoolyard/config'
import { AppProviders } from './providers'
import { SchoolProvider, useSchoolContext } from '../lib/school-context'
import { registerForPushNotifications } from '../lib/notifications'
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

/**
 * Handles routing based on school selection state.
 * If no school is selected, redirects to the school picker.
 * Also registers for push notifications once a school is selected.
 */
function SchoolGate() {
  const { schoolSlug, isLoading } = useSchoolContext()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    const onPickerScreen = segments[0] === 'school-picker'

    if (!schoolSlug && !onPickerScreen) {
      router.replace('/school-picker')
    } else if (schoolSlug && onPickerScreen) {
      router.replace('/(tabs)')
    }
  }, [schoolSlug, isLoading, segments, router])

  // Register for push notifications when a school is selected
  useEffect(() => {
    if (!schoolSlug) return
    registerForPushNotifications(schoolSlug).catch(() => {
      // Silent failure — push is optional. Registration will retry next launch.
    })
  }, [schoolSlug])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <SchoolProvider>
          <StatusBar style="auto" />
          <SchoolGate />
        </SchoolProvider>
      </AppProviders>
    </SafeAreaProvider>
  )
}
