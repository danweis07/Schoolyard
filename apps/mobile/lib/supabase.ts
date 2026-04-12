/**
 * Mobile-side Supabase client — one browser/anon client for reads and
 * auth, backed by AsyncStorage for persistent sessions across launches.
 *
 * Env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * These are exposed to the Expo bundle at build time by Metro.
 */
import { createBrowserClient, type Database, type SupabaseClient } from '@schoolyard/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type SchoolyardSupabase = SupabaseClient<Database>

let cached: SchoolyardSupabase | null = null

export function getSupabase(): SchoolyardSupabase | null {
  if (cached) return cached
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  cached = createBrowserClient({
    url,
    anonKey,
    storage: AsyncStorage,
    storageKey: 'sy-auth-mobile',
  })
  return cached
}

export function hasSupabase(): boolean {
  return getSupabase() !== null
}
