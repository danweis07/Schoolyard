#!/usr/bin/env node
/**
 * Schoolyard interactive setup wizard.
 * Prompts a school for the basics and writes school.config.json.
 *
 * Usage: pnpm setup
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const examplePath = join(repoRoot, 'school.config.example.json')
const targetPath = join(repoRoot, 'school.config.json')

const rl = createInterface({ input: stdin, output: stdout })

async function ask(question, defaultValue) {
  const hint = defaultValue ? ` [${defaultValue}]` : ''
  const answer = (await rl.question(`${question}${hint}: `)).trim()
  return answer || defaultValue || ''
}

async function askBool(question, defaultValue) {
  const hint = defaultValue ? 'Y/n' : 'y/N'
  const answer = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase()
  if (!answer) return defaultValue
  return answer === 'y' || answer === 'yes'
}

async function main() {
  console.warn('\n🏫 Welcome to Schoolyard setup!\n')
  console.warn('This wizard will create your school.config.json file.')
  console.warn("You can edit it by hand later. Press Enter to accept defaults.\n")

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

  console.warn('\n--- Modules ---')
  console.warn('Which modules do you want enabled? (press Enter for default)')
  example.modules.events = await askBool('Enable Events', true)
  example.modules.news = await askBool('Enable News', true)
  example.modules.pta = await askBool('Enable PTA', true)
  example.modules.volunteer = await askBool('Enable Volunteer', true)
  example.modules.fundraising = await askBool('Enable Fundraising', true)

  writeFileSync(targetPath, JSON.stringify(example, null, 2) + '\n', 'utf8')
  console.warn(`\n✅ Wrote ${targetPath}`)
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
