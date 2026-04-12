/**
 * Mobile-side Supabase client — AUTH ONLY.
 *
 * This client is used exclusively for Supabase Auth operations:
 *   - signInWithOtp / signOut / getSession / onAuthStateChange
 *
 * ALL data reads go through the gateway edge function via the content-api
 * gateway adapter (see `./manifest.ts`). NEVER call `.from()` on this
 * client for data queries — the gateway is the single point of data access.
 *
 * Env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * These are exposed to the Expo bundle at build time by Metro.
 */
import { createBrowserClient, type Database, type SupabaseClient } from '@schoolyard/supabase'

export type SchoolyardSupabase = SupabaseClient<Database>

/**
 * Best-effort storage adapter. In-memory by default — sessions won't
 * persist across app restarts. Swap in AsyncStorage once it's wired:
 *
 *   import AsyncStorage from '@react-native-async-storage/async-storage'
 *   const storage = AsyncStorage
 */
const memoryStore = new Map<string, string>()
const defaultStorage = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value)
  },
  removeItem: (key: string) => {
    memoryStore.delete(key)
  },
}

let cached: SchoolyardSupabase | null = null

export function getSupabase(): SchoolyardSupabase | null {
  if (cached) return cached
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  cached = createBrowserClient({
    url,
    anonKey,
    storage: defaultStorage,
    storageKey: 'sy-auth-mobile',
  })
  return cached
}

export function hasSupabase(): boolean {
  return getSupabase() !== null
}
