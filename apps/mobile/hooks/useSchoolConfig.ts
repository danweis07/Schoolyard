import { siteConfig } from '../lib/config'
import type { SchoolConfig } from '@schoolyard/config'

/**
 * Returns the (validated) school config. v1 is synchronous because the
 * config is bundled at build time. Future versions will fetch updates from
 * the school's published JSON manifest.
 */
export function useSchoolConfig(): SchoolConfig {
  return siteConfig
}
