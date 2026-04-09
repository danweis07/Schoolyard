#!/usr/bin/env tsx
/**
 * Validates school.config.json against the Zod schema in @schoolyard/config.
 * Run automatically before every build via Turborepo.
 *
 * Usage: pnpm validate-config
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadSchoolConfig } from '../packages/config/src/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

async function main() {
  const configPath = join(repoRoot, 'school.config.json')
  if (!existsSync(configPath)) {
    console.error(
      '❌ school.config.json not found at repo root.\n' +
        '   Run `pnpm setup` or copy school.config.example.json to school.config.json.',
    )
    process.exit(1)
  }

  try {
    const config = await loadSchoolConfig(configPath)
    console.warn(`✅ school.config.json is valid (${config.school.name})`)
  } catch (err) {
    console.error('❌ school.config.json failed validation:\n')
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
