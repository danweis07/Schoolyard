#!/usr/bin/env tsx
/**
 * Build a specific school's site from an external `school.config.json`
 * without touching the repo's own `school.config.json`.
 *
 * Usage:
 *   pnpm build:school <path-to-school.config.json>
 *
 * Example:
 *   pnpm build:school ./josh/school.config.fsk.json
 *   pnpm build:school /var/hub/schools/longfellow/school.config.json
 *
 * This is the external-driver entry point for the Hub: given a config path,
 * spawn `pnpm --filter web build` with `SCHOOLYARD_CONFIG` set in the env,
 * so every `loadSchoolConfigSync()` call site picks up that config. The
 * repo's own `school.config.json` is left untouched.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CONFIG_ENV_VAR } from '../packages/config/src/loader.js'
import { loadSchoolConfigSync } from '../packages/config/src/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

function usage(): never {
  console.error('Usage: pnpm build:school <path-to-school.config.json>')
  process.exit(1)
}

function main(): void {
  const [, , rawPath] = process.argv
  if (!rawPath) usage()

  const configPath = resolve(rawPath)
  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`)
    process.exit(1)
  }

  // Validate up-front so we fail fast with a friendly error instead of a
  // cryptic build-time crash.
  let schoolName: string
  try {
    const config = loadSchoolConfigSync(configPath)
    schoolName = config.school.name
  } catch (err) {
    console.error('❌ Config failed validation:')
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  console.warn(`🏫 Building ${schoolName}`)
  console.warn(`   config: ${configPath}`)
  console.warn('')

  const result = spawnSync('pnpm', ['--filter', 'web', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, [CONFIG_ENV_VAR]: configPath },
  })

  if (result.error) {
    console.error(`❌ Failed to spawn build: ${result.error.message}`)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

main()
