import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSchoolConfigSync, loadSchoolConfig } from './loader.js'

describe('loadSchoolConfigSync', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'schoolyard-loader-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('loads and validates a minimal config file', () => {
    const configPath = join(tempDir, 'school.config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        school: { name: 'Sandbox', shortName: 'Sandbox' },
      }),
    )

    const config = loadSchoolConfigSync(configPath)
    expect(config.school.name).toBe('Sandbox')
    expect(config.modules.events).toBe(true) // default
  })

  it('throws a friendly error when the config file is missing', () => {
    // chdir into an empty dir so the walk-up fallback doesn't find the
    // repo root's school.config.json.
    const emptyDir = join(tempDir, 'empty')
    mkdirSync(emptyDir, { recursive: true })
    const originalCwd = process.cwd()
    try {
      process.chdir(emptyDir)
      const missingPath = join(emptyDir, 'nope.json')
      expect(() => loadSchoolConfigSync(missingPath)).toThrow(/not found/)
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('throws with Zod validation issues on invalid config', () => {
    const configPath = join(tempDir, 'school.config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        school: { name: 'Sandbox', shortName: 'Sandbox' },
        branding: { primaryColor: 'notahexcolor' },
      }),
    )

    let threw = false
    try {
      loadSchoolConfigSync(configPath)
    } catch (err) {
      threw = true
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toContain('primaryColor')
    }
    expect(threw).toBe(true)
  })

  it('throws when the file is not valid JSON', () => {
    const configPath = join(tempDir, 'school.config.json')
    writeFileSync(configPath, '{ not valid json ')
    expect(() => loadSchoolConfigSync(configPath)).toThrow(/parse/i)
  })

  it('walks up from a nested cwd to find school.config.json', () => {
    const configPath = join(tempDir, 'school.config.json')
    writeFileSync(configPath, JSON.stringify({ school: { name: 'A', shortName: 'A' } }))
    const nested = join(tempDir, 'apps', 'web', 'src')
    mkdirSync(nested, { recursive: true })

    const originalCwd = process.cwd()
    try {
      process.chdir(nested)
      const config = loadSchoolConfigSync()
      expect(config.school.name).toBe('A')
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('loads a district-mode config', () => {
    const configPath = join(tempDir, 'school.config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        school: { name: 'Unified', shortName: 'Unified' },
        district: {
          name: 'Unified',
          shortName: 'Unified',
          schools: [
            { slug: 'school-a', name: 'School A', shortName: 'A' },
            { slug: 'school-b', name: 'School B', shortName: 'B' },
          ],
        },
      }),
    )

    const config = loadSchoolConfigSync(configPath)
    expect(config.district?.schools).toHaveLength(2)
  })
})

describe('loadSchoolConfig (async)', () => {
  it('is a thin async wrapper around loadSchoolConfigSync', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'schoolyard-loader-async-'))
    try {
      const configPath = join(tempDir, 'school.config.json')
      writeFileSync(
        configPath,
        JSON.stringify({ school: { name: 'Async Test', shortName: 'Async' } }),
      )

      const config = await loadSchoolConfig(configPath)
      expect(config.school.name).toBe('Async Test')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
