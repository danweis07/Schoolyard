/**
 * Browser/runtime-safe entry — schema, types, and helpers only.
 * Node-only loader lives in `./loader.js` (subpath import).
 */
export {
  schoolConfigSchema,
  schoolSchema,
  ptaSchema,
  brandingSchema,
  socialSchema,
  languagesSchema,
  modulesSchema,
  fundraisingSchema,
  appSchema,
  deploymentSchema,
  localeSchema,
  SUPPORTED_LOCALES,
  MODULE_NAMES,
} from './schema.js'

export type { SchoolConfig, Modules, Locale, ModuleName } from './schema.js'

export { defaultConfig } from './defaults.js'

import { MODULE_NAMES } from './schema.js'
import type { ModuleName, SchoolConfig } from './schema.js'

/**
 * Returns the names of all modules currently enabled in the config.
 * Pure function — safe to use in any environment.
 */
export function getEnabledModules(config: SchoolConfig): ModuleName[] {
  return MODULE_NAMES.filter((name) => config.modules[name])
}

export function isModuleEnabled(config: SchoolConfig, name: ModuleName): boolean {
  return config.modules[name] === true
}
