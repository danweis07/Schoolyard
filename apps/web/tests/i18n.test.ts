import { describe, it, expect } from 'vitest'
import { t, isPopulated, detectLocale } from '@schoolyard/i18n'

describe('i18n integration in web app', () => {
  it('translates nav labels in Spanish', () => {
    expect(t('nav.events', 'es')).toBe('Eventos')
    expect(t('nav.home', 'es')).toBe('Inicio')
  })

  it('falls back to English for missing keys in any locale', () => {
    // `_test.englishOnlyFallback` is intentionally present only in en.json,
    // so every other locale must fall through to English for this key.
    expect(t('_test.englishOnlyFallback', 'es')).toBe('English-only fallback fixture')
    expect(t('_test.englishOnlyFallback', 'ht')).toBe('English-only fallback fixture')
  })

  it('reports populated locales correctly', () => {
    expect(isPopulated('en')).toBe(true)
    expect(isPopulated('es')).toBe(true)
    expect(isPopulated('zh-hans')).toBe(true)
    expect(isPopulated('ru')).toBe(true)
    expect(isPopulated('tl')).toBe(true)
  })

  it('detects locale from accept-language header', () => {
    expect(detectLocale('es-MX,es;q=0.9,en;q=0.8', ['en', 'es', 'zh-hans'])).toBe('es')
    expect(detectLocale('zh-CN', ['en', 'zh-hans'])).toBe('zh-hans')
  })
})
