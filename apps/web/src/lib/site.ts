/**
 * Centralized site-wide config helpers — every page imports `siteConfig`
 * from here so there's exactly one place to read school.config.json from.
 */
import { loadSchoolConfigSync } from '@schoolyard/config/loader'

export const siteConfig = loadSchoolConfigSync()
