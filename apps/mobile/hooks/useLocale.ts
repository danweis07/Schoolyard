import { useMemo } from 'react'
import { getLocales } from 'expo-localization'
import { siteConfig } from '../lib/config'
import { t as tRaw } from '@schoolyard/i18n'
import type { Locale } from '@schoolyard/i18n'

/**
 * Detects the user's locale from the device settings, preferring
 * whichever device language is also in the school's supported list.
 * Falls back to the school's default locale.
 */
export function useLocale(): Locale {
  return useMemo(() => {
    const supported = siteConfig.languages.supported as readonly string[]
    const device = getLocales()
    for (const entry of device) {
      const code = (entry.languageTag || entry.languageCode || '').toLowerCase()
      // Exact match first
      if (supported.includes(code)) return code as Locale
      // Base language match (e.g. 'es-MX' → 'es')
      const base = code.split('-')[0]
      if (supported.includes(base)) return base as Locale
      // Chinese variant mapping
      if (code.startsWith('zh-tw') || code === 'zh-hant') {
        if (supported.includes('zh-hant')) return 'zh-hant'
      }
      if (code.startsWith('zh-cn') || code === 'zh-hans' || code.startsWith('zh')) {
        if (supported.includes('zh-hans')) return 'zh-hans'
      }
    }
    return siteConfig.languages.default
  }, [])
}

/**
 * Returns a bound translation function for the current device locale.
 * Mirrors the web-side `useTranslate` pattern.
 */
export function useTranslate(locale?: Locale) {
  const detected = useLocale()
  const effective = locale ?? detected
  return (key: string, params?: Record<string, string | number>): string =>
    tRaw(key, effective, params)
}
