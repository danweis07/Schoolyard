/**
 * createContentClient — the single entry point consumers should use going
 * forward. Picks an adapter based on `backend`; consumers write against
 * the `ContentAdapter` interface and never care about static vs Supabase.
 *
 * Back-compat: the legacy named exports (`fetchEvents`, `fetchNews`, ...)
 * continue to work in static mode via `packages/content-api/src/manifest.ts`.
 * New code should prefer `createContentClient()` for the richer API.
 */
import type { SupabaseClient, Database } from '@schoolyard/supabase'
import type { ContentAdapter } from './adapters/types.js'
import { createStaticAdapter } from './adapters/static.js'
import { createSupabaseAdapter } from './adapters/supabase.js'
import { createGatewayAdapter } from './adapters/gateway.js'

export type ContentBackend = 'static' | 'supabase' | 'gateway'

export interface ContentClientOptions {
  backend: ContentBackend
  /** Static mode: the deployed site URL that serves `/api/*.json`. */
  baseUrl?: string
  /** Supabase mode: the typed client. */
  supabase?: SupabaseClient<Database>
  /** Supabase / gateway mode: fallback slug when the scope omits one. */
  defaultSchoolSlug?: string
  /** Gateway mode: the Supabase project URL (e.g. https://xyz.supabase.co). */
  gatewayUrl?: string
}

export function createContentClient(options: ContentClientOptions): ContentAdapter {
  if (options.backend === 'gateway') {
    if (!options.gatewayUrl) {
      throw new Error('createContentClient: backend "gateway" requires a `gatewayUrl`')
    }
    return createGatewayAdapter({
      gatewayUrl: options.gatewayUrl,
      defaultSchoolSlug: options.defaultSchoolSlug,
    })
  }

  if (options.backend === 'supabase') {
    if (!options.supabase) {
      throw new Error('createContentClient: backend "supabase" requires a `supabase` client')
    }
    return createSupabaseAdapter({
      client: options.supabase,
      defaultSchoolSlug: options.defaultSchoolSlug,
    })
  }

  if (!options.baseUrl) {
    throw new Error('createContentClient: backend "static" requires a `baseUrl`')
  }
  return createStaticAdapter({ baseUrl: options.baseUrl })
}

export type { ContentAdapter, FetchOptions, Scope } from './adapters/types.js'
