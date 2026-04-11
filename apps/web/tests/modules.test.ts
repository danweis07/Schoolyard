import { describe, it, expect } from 'vitest'
import { schoolConfigSchema } from '@schoolyard/config'
import { getNavModules, getModuleManifest } from '../src/lib/modules'

/**
 * Tests for the module manifest registry — ensures getNavModules()
 * filters correctly based on config + implemented status.
 */

describe('getNavModules', () => {
  it('returns nothing when no modules are enabled', () => {
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
    expect(getNavModules(config)).toEqual([])
  })

  it('returns manifests for enabled modules in canonical order', () => {
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
    const names = getNavModules(config).map((m) => m.name)
    expect(names).toEqual(['pta', 'events', 'fundraising', 'news'])
  })

  it('includes all 12 modules as implemented in v1', () => {
    // After Phase 3 of the manifest work, every module has real pages.
    // This test ensures we don't accidentally ship a stub again.
    const allEnabled = schoolConfigSchema.parse({
      school: { name: 'Test', shortName: 'Test' },
      modules: {
        pta: true,
        events: true,
        volunteer: true,
        fundraising: true,
        news: true,
        lunch: true,
        transportation: true,
        community: true,
        classroom: true,
        district: true,
        resources: true,
        transparency: true,
      },
    })
    const nav = getNavModules(allEnabled)
    expect(nav.length).toBe(12)
  })
})

describe('getModuleManifest', () => {
  it('returns the manifest for a known module', () => {
    const events = getModuleManifest('events')
    expect(events.name).toBe('events')
    expect(events.route).toBe('/events')
    expect(events.implemented).toBe(true)
  })

  it('returns an implemented manifest for resources (was previously a stub)', () => {
    const resources = getModuleManifest('resources')
    expect(resources.implemented).toBe(true)
    expect(resources.route).toBe('/resources')
  })
})
