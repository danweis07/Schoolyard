import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types.js'

export interface ServiceClientOptions {
  url: string
  /**
   * Service role key. Bypasses all RLS. MUST be kept server-side only —
   * never import this factory from any code that ships to a browser or
   * mobile bundle.
   */
  serviceRoleKey: string
}

/**
 * Create a Supabase client that bypasses RLS via the service role key.
 * Only for trusted Node scripts:
 *   - scripts/migrate-to-supabase.ts (content seeding)
 *   - supabase/functions/** (edge functions that need admin ops)
 *   - operational scripts run from a secure environment
 *
 * Importing this from apps/web or apps/mobile is a bug.
 */
export function createServiceClient(options: ServiceClientOptions): SupabaseClient<Database> {
  return createClient<Database>(options.url, options.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
