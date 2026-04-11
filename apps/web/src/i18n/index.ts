/**
 * Wraps @schoolyard/i18n with Astro-specific helpers.
 *
 * Use `getLocaleFromUrl(Astro.url)` at the top of any page or layout
 * to determine the active locale, then pass it into `t()`.
 */
import { t as baseT, parseLocale } from '@schoolyard/i18n'
import type { Locale } from '@schoolyard/i18n'
import { loadSchoolConfigSync } from '@schoolyard/config/loader'

const config = loadSchoolConfigSync()

export const defaultLocale: Locale = config.languages.default
export const supportedLocales: Locale[] = [...config.languages.supported]

/**
 * Read the locale from the URL path. Astro's i18n routing puts non-default
 * locales as the first path segment (e.g. /es/about, /zh-hans/events).
 * Falls back to the school's default locale.
 */
export function getLocaleFromUrl(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean)
  const candidate = parseLocale(segments[0])
  if (candidate && supportedLocales.includes(candidate)) return candidate
  return defaultLocale
}

/**
 * Convenience wrapper that binds the current locale, so callers can write
 * `const t = useTranslate(locale); t('nav.home')`.
 */
export function useTranslate(locale: Locale) {
  return (key: string, params?: Record<string, string | number>) => baseT(key, locale, params)
}

/**
 * Build a localized URL by prepending the locale prefix when needed.
 * Default locale gets no prefix (matches Astro's prefixDefaultLocale: false).
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === defaultLocale) return clean
  return `/${locale}${clean}`
}

/**
 * Return one getStaticPaths entry per supported locale.
 *
 * Pages living under `src/pages/[...locale]/...` use this to render once per
 * locale. The default locale returns `{ locale: undefined }` so Astro's
 * `[...locale]` rest-parameter matches zero path segments and the page emits
 * at its bare path (e.g. `/events`), while non-default locales emit at
 * `/<locale>/events`.
 *
 * Pages with their own dynamic params (like `[slug].astro`) should call this
 * and spread the entries into a flatMap over their own getStaticPaths result.
 */
export function localeStaticPaths(): Array<{ params: { locale: string | undefined } }> {
  return supportedLocales.map((code) => ({
    params: { locale: code === defaultLocale ? undefined : code },
  }))
}
