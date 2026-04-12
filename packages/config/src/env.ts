/**
 * Runtime env validation for Supabase backend mode.
 *
 * Call once at startup (web middleware init, mobile root layout) to fail
 * fast with a readable error instead of silently serving broken pages.
 */

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
}

const REQUIRED_SUPABASE_VARS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const

/**
 * Check that all required env vars are present for supabase backend mode.
 * Returns the validation result rather than throwing, so callers can
 * decide how to surface the error (console, crash, banner).
 */
export function validateSupabaseEnv(env: Record<string, string | undefined>): EnvValidationResult {
  const missing: string[] = []
  for (const key of REQUIRED_SUPABASE_VARS) {
    if (!env[key]) missing.push(key)
  }
  return { valid: missing.length === 0, missing }
}

/**
 * Convenience: throws with a descriptive error if required vars are missing.
 * Use in contexts where a crash-on-start is the right behavior.
 */
export function assertSupabaseEnv(env: Record<string, string | undefined>): void {
  const result = validateSupabaseEnv(env)
  if (!result.valid) {
    throw new Error(
      `[Schoolyard] Missing required env vars for supabase backend mode: ${result.missing.join(', ')}. ` +
        `Set these in your .env file or hosting provider. See .env.example for reference.`,
    )
  }
}
