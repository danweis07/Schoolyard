import { describe, it, expect } from 'vitest'
import { schoolConfigSchema, getEnabledModules } from './index.js'

describe('schoolConfigSchema', () => {
  it('accepts a minimal valid config', () => {
    const result = schoolConfigSchema.safeParse({
      school: { name: 'Test', shortName: 'Test' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid hex colors', () => {
    const result = schoolConfigSchema.safeParse({
      school: { name: 'Test', shortName: 'Test' },
      branding: { primaryColor: 'blue' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects unsupported locale codes', () => {
    const result = schoolConfigSchema.safeParse({
      school: { name: 'Test', shortName: 'Test' },
      languages: { default: 'klingon', supported: ['klingon'] },
    })
    expect(result.success).toBe(false)
  })

  it('applies defaults to optional sections', () => {
    const result = schoolConfigSchema.parse({
      school: { name: 'Test', shortName: 'Test' },
    })
    expect(result.modules.events).toBe(true)
    expect(result.modules.news).toBe(true)
    expect(result.languages.default).toBe('en')
  })
})

describe('getEnabledModules', () => {
  it('returns only enabled modules in canonical order', () => {
    const config = schoolConfigSchema.parse({
      school: { name: 'Test', shortName: 'Test' },
      modules: {
        pta: true,
        events: true,
        volunteer: false,
        fundraising: true,
        news: true,
        lunch: false,
        transportation: false,
        community: false,
        classroom: false,
        district: false,
        resources: false,
        transparency: false,
      },
    })
    expect(getEnabledModules(config)).toEqual(['pta', 'events', 'fundraising', 'news'])
  })
})
