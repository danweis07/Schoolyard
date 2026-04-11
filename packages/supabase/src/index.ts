/**
 * @schoolyard/supabase — typed Supabase client factories for the Schoolyard
 * monorepo.
 *
 * Three factories for three contexts:
 *   - createBrowserClient — for web browsers (Astro client islands + mobile)
 *     and any anon-key code path. Persists sessions in localStorage /
 *     AsyncStorage depending on the host platform.
 *   - createServerClient  — for Astro SSR (middleware + endpoints). Reads
 *     anon key, but forwards request cookies so RLS sees the signed-in user.
 *   - createServiceClient — for trusted Node scripts (migrations, edge
 *     functions, admin tooling). Uses the service role key and BYPASSES
 *     all RLS. NEVER ship this to the browser.
 *
 * All three return a typed client parameterized by the generated
 * `Database` type from `./database.types`. After running
 * `pnpm supabase gen types typescript` the generated file replaces the
 * placeholder in `database.types.ts`.
 */

export { createBrowserClient } from './browser.js'
export { createServerClient } from './server.js'
export { createServiceClient } from './service.js'
export type { Database } from './database.types.js'
export type { SupabaseClient, SupabaseClientOptions, Session, User } from '@supabase/supabase-js'
