import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { schoolConfigSchema } from './schema.js'
import type { SchoolConfig } from './schema.js'

/**
 * Walks up from the given start directory looking for school.config.json.
 * Falls back to repo root resolution from this package's location.
 */
function findConfigPath(start?: string): string {
  if (start && existsSync(start)) return start

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
