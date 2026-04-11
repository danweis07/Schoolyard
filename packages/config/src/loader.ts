import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { schoolConfigSchema } from './schema.js'
import type { SchoolConfig } from './schema.js'

/**
 * Environment variable that, when set, overrides all other config discovery.
 * Used by the Hub and by `pnpm build:school <path>` to build a specific
 * school's config from a shared git tree without editing files in place.
 */
export const CONFIG_ENV_VAR = 'SCHOOLYARD_CONFIG'

/**
 * Resolves the config path using this priority order:
 *   1. Explicit `start` argument (for tests and programmatic callers).
 *   2. `SCHOOLYARD_CONFIG` environment variable (for the Hub / multi-tenant builds).
 *   3. Walk up from `process.cwd()` looking for `school.config.json`.
 *   4. Fall back to a path relative to this package (ESM-only).
 */
function findConfigPath(start?: string): string {
  if (start && existsSync(start)) return start

  const fromEnv = process.env[CONFIG_ENV_VAR]
  if (fromEnv) {
    const absolute = resolve(fromEnv)
    if (!existsSync(absolute)) {
      throw new Error(`${CONFIG_ENV_VAR} points to ${absolute} but that file does not exist.`)
    }
    return absolute
  }

  // Walk up from cwd
  let dir = process.cwd()
  while (dir !== '/') {
    const candidate = join(dir, 'school.config.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // Fallback: resolve relative to this package (works in Node ESM)
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const fromPackage = resolve(here, '..', '..', '..', '..', 'school.config.json')
    if (existsSync(fromPackage)) return fromPackage
  } catch {
    // import.meta.url not available in some contexts; fall through
  }

  throw new Error(
    'school.config.json not found. Run `pnpm setup` or copy school.config.example.json.',
  )
}

/**
 * Loads and validates school.config.json. Throws a friendly error if the
 * file is missing or fails Zod validation. Node-only — uses fs.
 */
export async function loadSchoolConfig(path?: string): Promise<SchoolConfig> {
  return loadSchoolConfigSync(path)
}

/**
 * Synchronous variant — used by Astro at build time where async config
 * loading is awkward. Same validation, same errors.
 */
export function loadSchoolConfigSync(path?: string): SchoolConfig {
  const configPath = findConfigPath(path)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (err) {
    throw new Error(
      `Failed to parse ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const result = schoolConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`school.config.json failed validation:\n${issues}`)
  }
  return result.data
}
