import { LOCALES } from './translate.js'
import type { Locale } from './translate.js'

/**
 * Picks the best supported locale given an Accept-Language header
 * (web) or a device locale string (mobile).
 *
 * Falls back to the supported list's first entry if no match.
 */
export function detectLocale(
  acceptLanguage: string | null | undefined,
  supported: readonly Locale[],
): Locale {
  if (!acceptLanguage || supported.length === 0) {
    return (supported[0] ?? 'en') as Locale
  }

  const candidates = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q = 'q=1'] = part.trim().split(';')
      return { tag: tag.toLowerCase(), q: parseFloat(q.split('=')[1]) || 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of candidates) {
    // exact match
    const exact = supported.find((s) => s.toLowerCase() === tag)
    if (exact) return exact
    const base = tag.split('-')[0]
    // Chinese subtype mapping must run before the generic base match,
    // since both 'zh-hans' and 'zh-hant' would otherwise match 'zh-*'.
    if (base === 'zh') {
      const variant =
        tag.includes('hant') || tag.includes('tw') || tag.includes('hk') || tag.includes('mo')
          ? 'zh-hant'
          : 'zh-hans'
      const zhMatch = supported.find((s) => s === variant)
      if (zhMatch) return zhMatch
    }
    // language-only match (e.g. 'en' from 'en-US')
    const baseMatch = supported.find(
      (s) => s.toLowerCase() === base || s.toLowerCase().startsWith(base + '-'),
    )
    if (baseMatch) return baseMatch
  }

  return supported[0] as Locale
}

/**
 * Type guard / parser: ensures a string is one of the 20 supported locales.
 */
export function parseLocale(value: string | undefined): Locale | undefined {
  if (!value) return undefined
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : undefined
}
