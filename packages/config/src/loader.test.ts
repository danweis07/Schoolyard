import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSchoolConfigSync, loadSchoolConfig, CONFIG_ENV_VAR } from './loader.js'

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

describe(`SCHOOLYARD_CONFIG env var (${CONFIG_ENV_VAR})`, () => {
  let tempDir: string
  const originalEnv = process.env[CONFIG_ENV_VAR]

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'schoolyard-env-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    if (originalEnv === undefined) {
      delete process.env[CONFIG_ENV_VAR]
    } else {
      process.env[CONFIG_ENV_VAR] = originalEnv
    }
  })

  it('loads from SCHOOLYARD_CONFIG when no explicit path is given', () => {
    const configPath = join(tempDir, 'from-env.json')
    writeFileSync(configPath, JSON.stringify({ school: { name: 'From Env', shortName: 'Env' } }))
    process.env[CONFIG_ENV_VAR] = configPath

    const config = loadSchoolConfigSync()
    expect(config.school.name).toBe('From Env')
  })

  it('prefers explicit path over SCHOOLYARD_CONFIG', () => {
    const envPath = join(tempDir, 'env.json')
    const explicitPath = join(tempDir, 'explicit.json')
    writeFileSync(envPath, JSON.stringify({ school: { name: 'Env Wins', shortName: 'Env' } }))
    writeFileSync(
      explicitPath,
      JSON.stringify({ school: { name: 'Explicit Wins', shortName: 'Explicit' } }),
    )
    process.env[CONFIG_ENV_VAR] = envPath

    const config = loadSchoolConfigSync(explicitPath)
    expect(config.school.name).toBe('Explicit Wins')
  })

  it('throws a clear error when SCHOOLYARD_CONFIG points to a missing file', () => {
    process.env[CONFIG_ENV_VAR] = join(tempDir, 'nonexistent.json')
    // Chdir into an empty dir so the cwd walk doesn't find a real config.
    const emptyDir = join(tempDir, 'empty')
    mkdirSync(emptyDir, { recursive: true })
    const originalCwd = process.cwd()
    try {
      process.chdir(emptyDir)
      expect(() => loadSchoolConfigSync()).toThrow(/SCHOOLYARD_CONFIG points to/)
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('SCHOOLYARD_CONFIG overrides the cwd walk fallback', () => {
    // Set up a "misleading" cwd that has its own school.config.json,
    // then point SCHOOLYARD_CONFIG somewhere else. Env var must win.
    const cwdConfigPath = join(tempDir, 'school.config.json')
    writeFileSync(
      cwdConfigPath,
      JSON.stringify({ school: { name: 'Cwd School', shortName: 'Cwd' } }),
    )
    const envConfigPath = join(tempDir, 'elsewhere.json')
    writeFileSync(
      envConfigPath,
      JSON.stringify({ school: { name: 'Env School', shortName: 'Env' } }),
    )
    process.env[CONFIG_ENV_VAR] = envConfigPath

    const originalCwd = process.cwd()
    try {
      process.chdir(tempDir)
      const config = loadSchoolConfigSync()
      expect(config.school.name).toBe('Env School')
    } finally {
      process.chdir(originalCwd)
    }
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

describe('multi-tenant build driver (two schools from one tree)', () => {
  /**
   * Phase 2 invariant: Core must be driveable from an external config path
   * without touching the repo's own school.config.json. This test proves
   * that loading two distinct configs from the same process yields two
   * distinct, independent SchoolConfig values.
   */
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'schoolyard-multi-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('builds two schools from one tree via distinct config paths', () => {
    const pathA = join(tempDir, 'school-a.json')
    const pathB = join(tempDir, 'school-b.json')

    writeFileSync(
      pathA,
      JSON.stringify({
        school: {
          name: 'Alpha Elementary',
          shortName: 'Alpha',
          timezone: 'America/New_York',
        },
        branding: { primaryColor: '#ff0000', accentColor: '#00ff00' },
        languages: { default: 'en', supported: ['en'] },
        modules: {
          pta: false,
          events: true,
          volunteer: false,
          fundraising: false,
          news: true,
          lunch: false,
          transportation: false,
          community: false,
          classroom: false,
          district: false,
          resources: false,
          transparency: false,
        },
        deployment: { siteUrl: 'https://alpha.example.org' },
      }),
    )

    writeFileSync(
      pathB,
      JSON.stringify({
        school: {
          name: 'Bravo Middle',
          shortName: 'Bravo',
          timezone: 'America/Los_Angeles',
        },
        branding: { primaryColor: '#0000ff', accentColor: '#ffff00' },
        languages: { default: 'es', supported: ['en', 'es'] },
        modules: {
          pta: true,
          events: true,
          volunteer: true,
          fundraising: true,
          news: true,
          lunch: true,
          transportation: false,
          community: false,
          classroom: false,
          district: false,
          resources: false,
          transparency: false,
        },
        deployment: { siteUrl: 'https://bravo.example.org' },
      }),
    )

    const a = loadSchoolConfigSync(pathA)
    const b = loadSchoolConfigSync(pathB)

    // Schools are distinct
    expect(a.school.name).toBe('Alpha Elementary')
    expect(b.school.name).toBe('Bravo Middle')
    expect(a.school.timezone).toBe('America/New_York')
    expect(b.school.timezone).toBe('America/Los_Angeles')

    // Branding is independent — no shared mutable state leaking between loads
    expect(a.branding.primaryColor).toBe('#ff0000')
    expect(b.branding.primaryColor).toBe('#0000ff')

    // Language config is independent
    expect(a.languages.default).toBe('en')
    expect(b.languages.default).toBe('es')
    expect(a.languages.supported).toEqual(['en'])
    expect(b.languages.supported).toEqual(['en', 'es'])

    // Module enablement is independent
    expect(a.modules.pta).toBe(false)
    expect(b.modules.pta).toBe(true)
    expect(a.modules.lunch).toBe(false)
    expect(b.modules.lunch).toBe(true)

    // Deployment URLs are independent (drives astro.config.mjs `site`)
    expect(a.deployment.siteUrl).toBe('https://alpha.example.org')
    expect(b.deployment.siteUrl).toBe('https://bravo.example.org')
  })

  it('loading the same config twice returns equivalent but independent objects', () => {
    const configPath = join(tempDir, 'school.config.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        school: { name: 'Charlie School', shortName: 'Charlie' },
      }),
    )

    const first = loadSchoolConfigSync(configPath)
    const second = loadSchoolConfigSync(configPath)

    expect(first).not.toBe(second) // different object references
    expect(first).toEqual(second) // same content
  })
})
