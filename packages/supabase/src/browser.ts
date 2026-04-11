import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types.js'

export interface BrowserClientOptions {
  url: string
  anonKey: string
  /**
   * Optional storage implementation. Defaults to localStorage in the browser.
   * Mobile passes Expo's AsyncStorage adapter.
   */
  storage?: {
    getItem: (key: string) => string | null | Promise<string | null>
    setItem: (key: string, value: string) => void | Promise<void>
    removeItem: (key: string) => void | Promise<void>
  }
  /** Optional storage key prefix. Defaults to 'sy-auth'. */
  storageKey?: string
}

/**
 * Create a Supabase client for the browser (or any anon-key context that
 * should persist sessions). Used by Astro client islands, the Expo app,
 * and any script that signs users in.
 */
export function createBrowserClient(options: BrowserClientOptions): SupabaseClient<Database> {
  return createClient<Database>(options.url, options.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: options.storage,
      storageKey: options.storageKey ?? 'sy-auth',
    },
  })
}
