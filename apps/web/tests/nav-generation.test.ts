import { describe, it, expect } from 'vitest'
import { schoolConfigSchema, getEnabledModules } from '@schoolyard/config'

describe('nav generation from school.config.json', () => {
  it('produces an empty list when no modules enabled', () => {
    const config = schoolConfigSchema.parse({
      school: { name: 'Test', shortName: 'Test' },
      modules: {
        pta: false,
        events: false,
        volunteer: false,
        fundraising: false,
        news: false,
        lunch: false,
        transportation: false,
        community: false,
        classroom: false,
        district: false,
        resources: false,
        transparency: false,
      },
    })
    expect(getEnabledModules(config)).toEqual([])
  })

  it('produces just news for a minimal deployment', () => {
    const config = schoolConfigSchema.parse({
      school: { name: 'Test', shortName: 'Test' },
      modules: {
        pta: false,
        events: false,
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
    })
    expect(getEnabledModules(config)).toEqual(['news'])
  })

  it('produces all enabled modules in canonical order for a full PTA deployment', () => {
    const config = schoolConfigSchema.parse({
      school: { name: 'Test', shortName: 'Test' },
      modules: {
        pta: true,
        events: true,
        volunteer: true,
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
    expect(getEnabledModules(config)).toEqual(['pta', 'events', 'volunteer', 'fundraising', 'news'])
  })
})
