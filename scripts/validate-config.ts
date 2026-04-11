#!/usr/bin/env tsx
/**
 * Validates school.config.json against the Zod schema in @schoolyard/config.
 * Run automatically before every build via Turborepo.
 *
 * Usage: pnpm validate-config
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { loadSchoolConfig, CONFIG_ENV_VAR } from '../packages/config/src/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

async function main() {
  // Priority: SCHOOLYARD_CONFIG env var → repo-root school.config.json.
  // This lets the Hub and `pnpm build:school <path>` validate any config
  // without touching the repo's default one.
  const envPath = process.env[CONFIG_ENV_VAR]
  const configPath = envPath ? resolve(envPath) : join(repoRoot, 'school.config.json')
  const source = envPath ? `${CONFIG_ENV_VAR}` : 'repo root'

  if (!existsSync(configPath)) {
    console.error(
      `❌ Config not found at ${configPath} (source: ${source}).\n` +
        '   Run `pnpm setup` or copy school.config.example.json to school.config.json.',
    )
    process.exit(1)
  }

  try {
    const config = await loadSchoolConfig(configPath)
    console.warn(`✅ ${configPath} is valid (${config.school.name})`)
  } catch (err) {
    console.error(`❌ ${configPath} failed validation:\n`)
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
