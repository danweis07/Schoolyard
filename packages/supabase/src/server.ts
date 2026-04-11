import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types.js'

export interface ServerClientOptions {
  url: string
  anonKey: string
  /**
   * Pre-resolved access token from the request cookies. When provided, the
   * client forwards it via the Authorization header so Postgres RLS sees
   * `auth.uid()` for the signed-in user.
   *
   * Pass `undefined` for anonymous requests — the client still works, it
   * just falls back to the anon role.
   */
  accessToken?: string
  /**
   * Optional request-scoped headers. Middleware uses this to inject
   * `x-school-id` for RLS-side school resolution when applicable.
   */
  headers?: Record<string, string>
}

/**
 * Create a Supabase client for server-side rendering (Astro middleware +
 * endpoints). Never persists a session — the access token is resolved per
 * request from cookies by the caller.
 */
export function createServerClient(options: ServerClientOptions): SupabaseClient<Database> {
  const globalHeaders: Record<string, string> = { ...(options.headers ?? {}) }
  if (options.accessToken) {
    globalHeaders.Authorization = `Bearer ${options.accessToken}`
  }

  return createClient<Database>(options.url, options.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: globalHeaders,
    },
  })
}
