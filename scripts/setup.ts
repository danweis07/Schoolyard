#!/usr/bin/env tsx
/**
 * Schoolyard interactive setup wizard.
 *
 * Walks a new school through picking a preset and filling in the basics,
 * then writes school.config.json. Presets are the progressive onboarding
 * on-ramp — pick one and you get a coherent module bundle out of the box.
 *
 * Usage: pnpm setup
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import {
  PRESET_NAMES,
  PRESET_DESCRIPTIONS,
  resolvePreset,
  type PresetName,
} from '../packages/config/src/presets.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const examplePath = join(repoRoot, 'school.config.example.json')
const targetPath = join(repoRoot, 'school.config.json')

const rl = createInterface({ input: stdin, output: stdout })

async function ask(question: string, defaultValue?: string): Promise<string> {
  const hint = defaultValue ? ` [${defaultValue}]` : ''
  const answer = (await rl.question(`${question}${hint}: `)).trim()
  return answer || defaultValue || ''
}

async function askBool(question: string, defaultValue: boolean): Promise<boolean> {
  const hint = defaultValue ? 'Y/n' : 'y/N'
  const answer = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase()
  if (!answer) return defaultValue
  return answer === 'y' || answer === 'yes'
}

async function askPreset(): Promise<PresetName> {
  console.warn('\n--- Pick a preset ---')
  console.warn('Presets are pre-built bundles of modules for common school profiles.')
  console.warn('You can toggle individual modules later in school.config.json.\n')

  PRESET_NAMES.forEach((name, i) => {
    console.warn(`  ${i + 1}. ${name}`)
    console.warn(`     ${PRESET_DESCRIPTIONS[name]}\n`)
  })

  while (true) {
    const answer = (await rl.question('Choose a preset [1-4, default 1]: ')).trim()
    if (!answer) return PRESET_NAMES[0]!
    const idx = Number.parseInt(answer, 10)
    if (Number.isInteger(idx) && idx >= 1 && idx <= PRESET_NAMES.length) {
      return PRESET_NAMES[idx - 1]!
    }
    console.warn(`  Please enter a number between 1 and ${PRESET_NAMES.length}.`)
  }
}

async function main() {
  console.warn('\n🏫 Welcome to Schoolyard setup!\n')
  console.warn('This wizard will create your school.config.json file.')
  console.warn('You can edit it by hand later. Press Enter to accept defaults.\n')

  if (existsSync(targetPath)) {
    const overwrite = await askBool('school.config.json already exists. Overwrite?', false)
    if (!overwrite) {
      console.warn('Aborted. Existing config left untouched.')
      rl.close()
      return
    }
  }

  const example = JSON.parse(readFileSync(examplePath, 'utf8'))

  example.school.name = await ask('School name', 'Longfellow Elementary')
  example.school.shortName = await ask('Short name', example.school.name.split(' ')[0])
  example.school.tagline = await ask('Tagline', 'Together We Can Make a Difference')
  example.school.address = await ask('Address', '')
  example.school.email = await ask('Contact email', '')
  example.school.district = await ask('District', '')
  example.branding.primaryColor = await ask('Primary brand color (hex)', '#1a4f8a')
  example.branding.accentColor = await ask('Accent color (hex)', '#f5a623')

  const preset = await askPreset()
  example.modules = resolvePreset(preset)

  writeFileSync(targetPath, JSON.stringify(example, null, 2) + '\n', 'utf8')
  console.warn(`\n✅ Wrote ${targetPath} (preset: ${preset})`)
  console.warn('\nNext steps:')
  console.warn('  1. Replace demo content in apps/web/src/content/')
  console.warn('  2. Add your logo to apps/web/public/images/')
  console.warn('  3. Run `pnpm dev` to preview your site')
  console.warn('')
  rl.close()
}

main().catch((err) => {
  console.error(err)
  rl.close()
  process.exit(1)
})
