import en from '../locales/en.json'
import es from '../locales/es.json'
import zhHans from '../locales/zh-hans.json'
import zhHant from '../locales/zh-hant.json'
import ar from '../locales/ar.json'
import vi from '../locales/vi.json'
import ht from '../locales/ht.json'
import so from '../locales/so.json'
import ru from '../locales/ru.json'
import tl from '../locales/tl.json'
import hmn from '../locales/hmn.json'
import pt from '../locales/pt.json'
import ko from '../locales/ko.json'
import hi from '../locales/hi.json'
import fr from '../locales/fr.json'
import am from '../locales/am.json'
import km from '../locales/km.json'
import ur from '../locales/ur.json'
import pa from '../locales/pa.json'
import sw from '../locales/sw.json'

/**
 * The 20 supported language codes per CLAUDE.md spec.
 * All 20 are registered; 5 have full translations, 15 have common + nav stubs
 * with English fallback for deeper keys.
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
  'zh-hant': zhHant as LocaleData,
  ar: ar as LocaleData,
  vi: vi as LocaleData,
  ht: ht as LocaleData,
  so: so as LocaleData,
  ru: ru as LocaleData,
  tl: tl as LocaleData,
  hmn: hmn as LocaleData,
  pt: pt as LocaleData,
  ko: ko as LocaleData,
  hi: hi as LocaleData,
  fr: fr as LocaleData,
  am: am as LocaleData,
  km: km as LocaleData,
  ur: ur as LocaleData,
  pa: pa as LocaleData,
  sw: sw as LocaleData,
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
