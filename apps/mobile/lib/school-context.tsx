/**
 * Runtime school context — replaces the build-time school.config.json
 * import with a React context that supports school discovery, selection,
 * and switching. Persists the selected school slug to AsyncStorage so
 * the choice survives app restarts.
 *
 * In supabase mode the app fetches the school list from the `schools`
 * table and constructs a SchoolConfig from the selected school's row.
 * In static/legacy mode it falls back to the bundled config.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SchoolConfig } from '@schoolyard/config'
import { schoolConfigSchema } from '@schoolyard/config'
import type { SchoolInfo } from '@schoolyard/content-api'
import type { SchoolRow } from '@schoolyard/supabase'
import { getSupabase } from './supabase'

const STORAGE_KEY = 'sy-selected-school'

export interface SchoolContextValue {
  /** The selected school's slug, or null if no school chosen yet. */
  schoolSlug: string | null
  /** Full config for the selected school (constructed from DB or bundled). */
  config: SchoolConfig | null
  /** The raw SchoolInfo from the DB (null in static mode or before selection). */
  schoolInfo: SchoolInfo | null
  /** True while loading saved selection from storage or fetching school data. */
  isLoading: boolean
  /** Select a school by slug. Persists to AsyncStorage. */
  selectSchool: (slug: string, info: SchoolInfo) => Promise<void>
  /** Clear the selection and return to the school picker. */
  clearSchool: () => Promise<void>
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

/**
 * Constructs a SchoolConfig from a SchoolInfo row. Fields not present
 * in the schools table (fundraising, social, pta, etc.) get defaults
 * from the Zod schema.
 */
function schoolInfoToConfig(info: SchoolInfo): SchoolConfig {
  const raw = {
    school: {
      name: info.name,
      shortName: info.shortName,
    },
    branding: info.branding,
    modules: info.modules,
    languages: info.languages,
    backend: 'supabase',
  }
  // Let Zod fill all defaults for missing fields
  return schoolConfigSchema.parse(raw)
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [config, setConfig] = useState<SchoolConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, check AsyncStorage for a saved school slug
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const savedSlug = await AsyncStorage.getItem(STORAGE_KEY)
        if (!savedSlug || cancelled) {
          setIsLoading(false)
          return
        }

        // Fetch the school info from Supabase to reconstruct config
        const supabase = getSupabase()
        if (!supabase) {
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('slug', savedSlug)
          .maybeSingle<SchoolRow>()

        if (cancelled) return

        if (error || !data) {
          // Saved school no longer exists — clear and show picker
          await AsyncStorage.removeItem(STORAGE_KEY)
          setIsLoading(false)
          return
        }

        const info: SchoolInfo = {
          id: data.id,
          slug: data.slug,
          name: data.name,
          shortName: data.short_name ?? data.name,
          branding: data.branding,
          modules: data.modules,
          languages: data.languages,
          districtId: data.district_id,
        }

        setSchoolSlug(savedSlug)
        setSchoolInfo(info)
        setConfig(schoolInfoToConfig(info))
      } catch {
        // On any error, fall through to picker
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const selectSchool = useCallback(async (slug: string, info: SchoolInfo) => {
    await AsyncStorage.setItem(STORAGE_KEY, slug)
    setSchoolSlug(slug)
    setSchoolInfo(info)
    setConfig(schoolInfoToConfig(info))
  }, [])

  const clearSchool = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY)
    setSchoolSlug(null)
    setSchoolInfo(null)
    setConfig(null)
  }, [])

  return (
    <SchoolContext.Provider
      value={{ schoolSlug, config, schoolInfo, isLoading, selectSchool, clearSchool }}
    >
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchoolContext(): SchoolContextValue {
  const ctx = useContext(SchoolContext)
  if (!ctx) {
    throw new Error('useSchoolContext must be used within a SchoolProvider')
  }
  return ctx
}
