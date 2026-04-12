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
  resourcesConfigSchema,
  resourceSourceSchema,
  spiritStoreSchema,
  appSchema,
  deploymentSchema,
  localeSchema,
  tenantSchoolSchema,
  districtSchema,
  supabaseSchema,
  backendModeSchema,
  SUPPORTED_LOCALES,
  MODULE_NAMES,
  BACKEND_MODES,
  RESOURCE_SOURCES,
} from './schema.js'

export type {
  SchoolConfig,
  Modules,
  ResourcesConfig,
  ResourceSource,
  Locale,
  ModuleName,
  TenantSchool,
  District,
  BackendMode,
  SupabaseConnection,
} from './schema.js'

export { defaultConfig } from './defaults.js'

export {
  isDistrictMode,
  isSingleTenant,
  getTenantSlugs,
  getDistrict,
  findTenant,
  resolveTenantConfig,
  getTenantContentSubdir,
} from './tenant.js'

export {
  PRESET_NAMES,
  PRESET_DESCRIPTIONS,
  MODULE_TIERS,
  resolvePreset,
  getPresetModules,
  inferPreset,
} from './presets.js'

export type { PresetName } from './presets.js'

export { validateSupabaseEnv, assertSupabaseEnv } from './env.js'
export type { EnvValidationResult } from './env.js'

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

/**
 * Returns the zip code to use for external resource lookups.
 * Prefers explicit `resourcesConfig.zipCode`, falls back to
 * regex-extracting a 5-digit zip from `school.address`.
 */
export function getResourceZipCode(config: SchoolConfig): string | undefined {
  if (config.resourcesConfig.zipCode) return config.resourcesConfig.zipCode
  const match = config.school.address.match(/\b(\d{5})(?:-\d{4})?\b/)
  return match?.[1]
}
