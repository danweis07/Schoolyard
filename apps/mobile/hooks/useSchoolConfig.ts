import { useSchoolContext } from '../lib/school-context'
import type { SchoolConfig } from '@schoolyard/config'
import { defaultConfig } from '@schoolyard/config'

/**
 * Returns the school config for the currently selected school.
 * Reads from SchoolContext (runtime Supabase data) rather than
 * a build-time JSON import. Falls back to the package default
 * config if no school is selected yet (should not happen in
 * normal flow since the school picker gates navigation).
 */
export function useSchoolConfig(): SchoolConfig {
  const { config } = useSchoolContext()
  return config ?? defaultConfig
}
