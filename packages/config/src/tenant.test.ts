import { describe, it, expect } from 'vitest'
import { schoolConfigSchema } from './schema.js'
import {
  isDistrictMode,
  isSingleTenant,
  getTenantSlugs,
  findTenant,
  resolveTenantConfig,
  getTenantContentSubdir,
  getDistrict,
} from './tenant.js'

const baseConfig = {
  school: { name: 'Test School', shortName: 'Test' },
}

const districtConfigInput = {
  school: { name: 'Unified District', shortName: 'Unified' },
  branding: { primaryColor: '#112233', accentColor: '#aabbcc' },
  languages: { default: 'en' as const, supported: ['en', 'es'] as const },
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
  district: {
    name: 'Unified District',
    shortName: 'Unified',
    schools: [
      {
        slug: 'longfellow',
        name: 'Longfellow Elementary',
        shortName: 'Longfellow',
        branding: { primaryColor: '#1a4f8a' },
      },
      {
        slug: 'mission-hills',
        name: 'Mission Hills Middle',
        shortName: 'Mission Hills',
        modules: { pta: true, fundraising: true },
      },
      {
        slug: 'closed-school',
        name: 'Closed School',
        shortName: 'Closed',
        active: false,
      },
    ],
  },
}

describe('tenant mode detection', () => {
  it('reports single-tenant for a config with no district block', () => {
    const config = schoolConfigSchema.parse(baseConfig)
    expect(isSingleTenant(config)).toBe(true)
    expect(isDistrictMode(config)).toBe(false)
  })

  it('reports district mode when district.schools is non-empty', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    expect(isDistrictMode(config)).toBe(true)
    expect(isSingleTenant(config)).toBe(false)
  })
})

describe('getTenantSlugs', () => {
  it('returns empty array in single-tenant mode', () => {
    const config = schoolConfigSchema.parse(baseConfig)
    expect(getTenantSlugs(config)).toEqual([])
  })

  it('returns only active schools in canonical order', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    expect(getTenantSlugs(config)).toEqual(['longfellow', 'mission-hills'])
  })
})

describe('findTenant', () => {
  it('returns undefined for single-tenant configs', () => {
    const config = schoolConfigSchema.parse(baseConfig)
    expect(findTenant(config, 'longfellow')).toBeUndefined()
  })

  it('returns a tenant by slug', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    const tenant = findTenant(config, 'mission-hills')
    expect(tenant?.name).toBe('Mission Hills Middle')
  })

  it('returns undefined for an unknown slug', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    expect(findTenant(config, 'does-not-exist')).toBeUndefined()
  })
})

describe('getDistrict', () => {
  it('throws on single-tenant configs', () => {
    const config = schoolConfigSchema.parse(baseConfig)
    expect(() => getDistrict(config)).toThrow(/single-tenant/)
  })

  it('returns the district block for district configs', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    const district = getDistrict(config)
    expect(district.name).toBe('Unified District')
    expect(district.schools).toHaveLength(3)
  })
})

describe('resolveTenantConfig', () => {
  it('returns the config unchanged for single-tenant mode', () => {
    const config = schoolConfigSchema.parse(baseConfig)
    const resolved = resolveTenantConfig(config, 'anything')
    expect(resolved).toEqual(config)
  })

  it('throws on an unknown slug in district mode', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    expect(() => resolveTenantConfig(config, 'mystery-school')).toThrow(/Unknown tenant slug/)
  })

  it('overrides school name/shortName from the tenant entry', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    const resolved = resolveTenantConfig(config, 'longfellow')
    expect(resolved.school.name).toBe('Longfellow Elementary')
    expect(resolved.school.shortName).toBe('Longfellow')
  })

  it('merges per-school branding over district defaults', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    const resolved = resolveTenantConfig(config, 'longfellow')
    expect(resolved.branding.primaryColor).toBe('#1a4f8a')
    // accentColor not overridden — inherits from district
    expect(resolved.branding.accentColor).toBe('#aabbcc')
  })

  it('merges per-school module overrides onto district defaults', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    const resolved = resolveTenantConfig(config, 'mission-hills')
    expect(resolved.modules.pta).toBe(true)
    expect(resolved.modules.fundraising).toBe(true)
    // news inherits from district (true)
    expect(resolved.modules.news).toBe(true)
  })

  it('strips the district block from the resolved config', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    const resolved = resolveTenantConfig(config, 'longfellow')
    expect(resolved.district).toBeUndefined()
    expect(isSingleTenant(resolved)).toBe(true)
  })
})

describe('getTenantContentSubdir', () => {
  it('returns empty string for single-tenant', () => {
    const config = schoolConfigSchema.parse(baseConfig)
    expect(getTenantContentSubdir(config, 'anything')).toBe('')
  })

  it('returns schools/<slug> for district mode', () => {
    const config = schoolConfigSchema.parse(districtConfigInput)
    expect(getTenantContentSubdir(config, 'longfellow')).toBe('schools/longfellow')
  })
})

describe('schoolConfigSchema district validation', () => {
  it('rejects district.schools with invalid slugs', () => {
    const result = schoolConfigSchema.safeParse({
      ...baseConfig,
      district: {
        name: 'Test',
        shortName: 'Test',
        schools: [{ slug: 'Not Valid!', name: 'X', shortName: 'X' }],
      },
    })
    expect(result.success).toBe(false)
  })

  it('requires at least one school in the district block', () => {
    const result = schoolConfigSchema.safeParse({
      ...baseConfig,
      district: { name: 'Test', shortName: 'Test', schools: [] },
    })
    expect(result.success).toBe(false)
  })

  it('accepts single-tenant configs with no district block', () => {
    const result = schoolConfigSchema.safeParse(baseConfig)
    expect(result.success).toBe(true)
  })
})
