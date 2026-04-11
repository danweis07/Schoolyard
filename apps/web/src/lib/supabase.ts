/**
 * Request-scoped Supabase helper for Astro SSR and middleware.
 *
 * In static mode this is mostly unused — pages read content from Astro
 * content collections directly. In hybrid mode (SSR + SSG), dynamic
 * pages use `Astro.locals.supabase` (populated by `src/middleware.ts`)
 * to run queries on behalf of the signed-in user, so RLS sees the
 * correct identity.
 *
 * NEVER import `createServiceClient` from here — the service role key
 * must not travel through any browser bundle. Edge functions and
 * trusted Node scripts are the only callers allowed to use it.
 */
import { createServerClient, type Database, type SupabaseClient } from '@schoolyard/supabase'

export type SchoolyardSupabase = SupabaseClient<Database>

export interface SupabaseRequestContext {
  /** Request cookies as a plain object. Middleware extracts this. */
  cookies?: Record<string, string>
  /** Bearer token from the `Authorization` header if set. */
  accessToken?: string
  /** Optional headers to forward on every request (e.g. `x-school-id`). */
  headers?: Record<string, string>
}

const CONFIG_ENV_KEYS = {
  url: 'SUPABASE_URL',
  anonKey: 'SUPABASE_ANON_KEY',
} as const

function readEnv(key: string): string | undefined {
  // Astro exposes PUBLIC_* env vars on import.meta.env at build time and
  // process.env on the server. Prefer process.env because it reflects
  // per-request overrides in hybrid mode.
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  const imetaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return imetaEnv?.[key]
}

/**
 * Builds a Supabase client scoped to a single request. Middleware
 * should call this once per request and stash the result on
 * `Astro.locals.supabase`.
 */
export function createRequestSupabase(
  context: SupabaseRequestContext = {},
): SchoolyardSupabase | null {
  const url = readEnv(CONFIG_ENV_KEYS.url)
  const anonKey = readEnv(CONFIG_ENV_KEYS.anonKey)
  if (!url || !anonKey) return null

  // Pull the access token from a Supabase Auth cookie if the caller
  // didn't provide one explicitly. The default cookie name is
  // `sb-<project-ref>-auth-token` — we match any cookie whose name
  // starts with `sb-` and ends with `-auth-token`.
  let accessToken = context.accessToken
  if (!accessToken && context.cookies) {
    for (const [name, value] of Object.entries(context.cookies)) {
      if (name.startsWith('sb-') && name.endsWith('-auth-token') && value) {
        try {
          const parsed = JSON.parse(value) as { access_token?: string } | string[]
          if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
            accessToken = parsed[0]
          } else if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
            accessToken = parsed.access_token
          }
        } catch {
          // Opaque cookie — forward as-is via Authorization header.
          accessToken = value
        }
        break
      }
    }
  }

  return createServerClient({
    url,
    anonKey,
    accessToken,
    headers: context.headers,
  })
}
