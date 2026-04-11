import { describe, it, expect } from 'vitest'
import { t, isPopulated, isRtl, detectLocale, parseLocale } from './index.js'

describe('t()', () => {
  it('returns English string for English locale', () => {
    expect(t('common.welcome', 'en')).toBe('Welcome')
  })

  it('falls back to English when key missing in target locale', () => {
    // `_test.englishOnlyFallback` is intentionally present only in en.json
    // (the fallback test fixture), so any other locale must fall through.
    expect(t('_test.englishOnlyFallback', 'es')).toBe('English-only fallback fixture')
    expect(t('_test.englishOnlyFallback', 'vi')).toBe('English-only fallback fixture')
  })

  it('returns translated string when present in target locale', () => {
    expect(t('nav.home', 'es')).toBe('Inicio')
  })

  it('returns the key itself when missing everywhere', () => {
    expect(t('made.up.key', 'en')).toBe('made.up.key')
  })

  it('interpolates {param} placeholders', () => {
    expect(t('common.welcomeName', 'en', { name: 'Maria' })).toBe('Welcome, Maria!')
  })

  it('returns translations for common/nav keys across locales', () => {
    expect(t('nav.home', 'fr')).toBe('Accueil')
    expect(t('nav.home', 'ko')).toBe('홈')
    expect(t('common.search', 'ar')).toBe('بحث')
  })

  it('falls back to English for keys missing in any locale', () => {
    // `_test.englishOnlyFallback` is intentionally present only in en.json,
    // so every other locale (both fully-translated and essentials-only)
    // must fall through to English for this key.
    expect(t('_test.englishOnlyFallback', 'fr')).toBe('English-only fallback fixture')
    expect(t('_test.englishOnlyFallback', 'ht')).toBe('English-only fallback fixture')
  })
})

describe('isPopulated()', () => {
  it('reports populated locales', () => {
    expect(isPopulated('en')).toBe(true)
    expect(isPopulated('es')).toBe(true)
    expect(isPopulated('zh-hans')).toBe(true)
    expect(isPopulated('ru')).toBe(true)
    expect(isPopulated('tl')).toBe(true)
  })

  it('reports stub locales as populated (all 20 are registered)', () => {
    expect(isPopulated('ar')).toBe(true)
    expect(isPopulated('fr')).toBe(true)
    expect(isPopulated('ko')).toBe(true)
  })
})

describe('isRtl()', () => {
  it('marks ar and ur as RTL', () => {
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('ur')).toBe(true)
  })

  it('marks LTR locales correctly', () => {
    expect(isRtl('en')).toBe(false)
    expect(isRtl('es')).toBe(false)
  })
})

describe('detectLocale()', () => {
  it('returns first supported when header is empty', () => {
    expect(detectLocale(null, ['en', 'es'])).toBe('en')
  })

  it('matches exact locale code', () => {
    expect(detectLocale('es', ['en', 'es'])).toBe('es')
  })

  it('matches language-only from regional tag', () => {
    expect(detectLocale('en-US,en;q=0.9', ['en', 'es'])).toBe('en')
  })

  it('handles q-weighted preferences', () => {
    expect(detectLocale('fr;q=0.5,es;q=0.9', ['en', 'es'])).toBe('es')
  })

  it('maps zh-TW to zh-hant', () => {
    expect(detectLocale('zh-TW', ['en', 'zh-hans', 'zh-hant'])).toBe('zh-hant')
  })

  it('falls back when no match', () => {
    expect(detectLocale('de', ['en', 'es'])).toBe('en')
  })
})

describe('parseLocale()', () => {
  it('returns valid locale codes', () => {
    expect(parseLocale('en')).toBe('en')
    expect(parseLocale('zh-hans')).toBe('zh-hans')
  })

  it('returns undefined for invalid codes', () => {
    expect(parseLocale('klingon')).toBeUndefined()
    expect(parseLocale(undefined)).toBeUndefined()
  })
})
