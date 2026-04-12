/**
 * Mobile-side Supabase client — used for Auth and direct writes.
 *
 * Auth operations:
 *   - signInWithOtp / signOut / getSession / onAuthStateChange
 *
 * Write operations (RSVP, volunteer hours, community flags, etc.)
 *   go through `.from()` directly since the gateway is read-only.
 *
 * Content reads go through the gateway edge function via the
 * content-api gateway adapter (see `./manifest.ts`).
 *
 * Auth sessions are persisted via AsyncStorage so they survive
 * app restarts.
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
