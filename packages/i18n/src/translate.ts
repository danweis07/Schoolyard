import en from '../locales/en.json'
import es from '../locales/es.json'
import zhHans from '../locales/zh-hans.json'
import ru from '../locales/ru.json'
import tl from '../locales/tl.json'

/**
 * The 20 supported language codes per CLAUDE.md spec.
 * Only 5 are populated in v1; the other 15 fall back to English silently.
 */
export const LOCALES = [
  'en',
  'es',
  'zh-hans',
  'zh-hant',
  'ar',
  'vi',
  'ht',
  'so',
  'ru',
  'tl',
  'hmn',
  'pt',
  'ko',
  'hi',
  'fr',
  'am',
  'km',
  'ur',
  'pa',
  'sw',
] as const

export type Locale = (typeof LOCALES)[number]

/**
 * Locale code → human-readable name in the locale's own language.
 * Used by the language switcher.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  'zh-hans': '简体中文',
  'zh-hant': '繁體中文',
  ar: 'العربية',
  vi: 'Tiếng Việt',
  ht: 'Kreyòl Ayisyen',
  so: 'Soomaali',
  ru: 'Русский',
  tl: 'Tagalog',
  hmn: 'Hmoob',
  pt: 'Português',
  ko: '한국어',
  hi: 'हिन्दी',
  fr: 'Français',
  am: 'አማርኛ',
  km: 'ខ្មែរ',
  ur: 'اردو',
  pa: 'ਪੰਜਾਬੀ',
  sw: 'Kiswahili',
}

/**
 * Locales that should render right-to-left.
 */
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ar', 'ur'])

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale)
}

type LocaleData = Record<string, unknown>

const dictionaries: Partial<Record<Locale, LocaleData>> = {
  en: en as LocaleData,
  es: es as LocaleData,
  'zh-hans': zhHans as LocaleData,
  ru: ru as LocaleData,
  tl: tl as LocaleData,
}

/**
 * Look up a dot-separated key in a locale dictionary.
 * Returns undefined if any segment is missing.
 */
function lookup(dict: LocaleData | undefined, key: string): string | undefined {
  if (!dict) return undefined
  let cursor: unknown = dict
  for (const segment of key.split('.')) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return typeof cursor === 'string' ? cursor : undefined
}

/**
 * Translate a key for a given locale.
 *
 * - Falls back to English silently if the key is missing in the requested locale
 * - Falls back to the key itself if missing in English (so devs see the broken key)
 * - Supports {param} interpolation: t('common.welcomeName', 'en', { name: 'Maria' })
 */
export function t(
  key: string,
  locale: Locale = 'en',
  params?: Record<string, string | number>,
): string {
  let value = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key) ?? key

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return value
}

/**
 * Returns true if the given locale has a populated dictionary in this build.
 */
export function isPopulated(locale: Locale): boolean {
  return locale in dictionaries
}
