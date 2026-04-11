import { describe, it, expect } from 'vitest'
import {
  PRESET_NAMES,
  MODULE_TIERS,
  resolvePreset,
  getPresetModules,
  inferPreset,
} from './index.js'
import { MODULE_NAMES } from './schema.js'

describe('MODULE_TIERS', () => {
  it('maps every module to exactly one tier', () => {
    for (const name of MODULE_NAMES) {
      expect(MODULE_TIERS[name]).toBeDefined()
      expect(PRESET_NAMES).toContain(MODULE_TIERS[name])
    }
  })

  it('has no modules outside the canonical MODULE_NAMES list', () => {
    const tierKeys = Object.keys(MODULE_TIERS)
    expect(tierKeys.length).toBe(MODULE_NAMES.length)
    for (const key of tierKeys) {
      expect(MODULE_NAMES).toContain(key as (typeof MODULE_NAMES)[number])
    }
  })
})

describe('resolvePreset', () => {
  it('just-getting-started enables only news and events', () => {
    const modules = resolvePreset('just-getting-started')
    expect(modules.news).toBe(true)
    expect(modules.events).toBe(true)
    expect(modules.pta).toBe(false)
    expect(modules.volunteer).toBe(false)
    expect(modules.fundraising).toBe(false)
    expect(modules.district).toBe(false)
  })

  it('active-pta adds pta, volunteer, fundraising on top of just-getting-started', () => {
    const modules = resolvePreset('active-pta')
    expect(modules.news).toBe(true)
    expect(modules.events).toBe(true)
    expect(modules.pta).toBe(true)
    expect(modules.volunteer).toBe(true)
    expect(modules.fundraising).toBe(true)
    expect(modules.community).toBe(false)
    expect(modules.district).toBe(false)
  })

  it('full-community-hub adds community, lunch, classroom, resources', () => {
    const modules = resolvePreset('full-community-hub')
    expect(modules.community).toBe(true)
    expect(modules.lunch).toBe(true)
    expect(modules.classroom).toBe(true)
    expect(modules.resources).toBe(true)
    expect(modules.district).toBe(false)
    expect(modules.transparency).toBe(false)
    expect(modules.transportation).toBe(false)
  })

  it('district-wide enables every module', () => {
    const modules = resolvePreset('district-wide')
    for (const name of MODULE_NAMES) {
      expect(modules[name]).toBe(true)
    }
  })

  it('presets are cumulative — each higher tier is a superset of the previous', () => {
    const tiers = PRESET_NAMES.map(resolvePreset)
    for (let i = 1; i < tiers.length; i++) {
      for (const name of MODULE_NAMES) {
        if (tiers[i - 1]![name]) {
          expect(tiers[i]![name]).toBe(true)
        }
      }
    }
  })
})

describe('getPresetModules', () => {
  it('returns module name list for each preset', () => {
    expect(getPresetModules('just-getting-started').sort()).toEqual(['events', 'news'])
    expect(getPresetModules('district-wide').length).toBe(MODULE_NAMES.length)
  })
})

describe('inferPreset', () => {
  it('identifies each preset from its modules record', () => {
    for (const name of PRESET_NAMES) {
      expect(inferPreset(resolvePreset(name))).toBe(name)
    }
  })

  it('returns undefined for non-preset combinations', () => {
    const custom = resolvePreset('just-getting-started')
    custom.pta = true // news + events + pta is not a clean preset
    expect(inferPreset(custom)).toBeUndefined()
  })
})
