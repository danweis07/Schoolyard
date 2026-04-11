/**
 * Module manifest registry — single source of truth for nav generation.
 *
 * Each module's index.ts exports a manifest. We import them all here so
 * the header can ask "which modules are enabled, in what order, with what
 * label?" without scanning the file system at runtime.
 */
import type { ModuleName, PresetName, SchoolConfig } from '@schoolyard/config'
import { getEnabledModules } from '@schoolyard/config'

import events from '@/modules/events/index.js'
import news from '@/modules/news/index.js'
import pta from '@/modules/pta/index.js'
import volunteer from '@/modules/volunteer/index.js'
import fundraising from '@/modules/fundraising/index.js'
import lunch from '@/modules/lunch/index.js'
import transportation from '@/modules/transportation/index.js'
import community from '@/modules/community/index.js'
import classroom from '@/modules/classroom/index.js'
import district from '@/modules/district/index.js'
import resources from '@/modules/resources/index.js'
import transparency from '@/modules/transparency/index.js'

export interface ModuleManifest {
  name: ModuleName
  /** i18n key for the nav label, e.g. 'nav.events' */
  navLabelKey: string
  /** Heroicons name for the nav icon */
  icon: string
  /** Top-level route this module owns, e.g. '/events' */
  route: string
  /** Whether this module is fully implemented in v1 (false = stub) */
  implemented: boolean
  /**
   * Smallest progressive-onboarding preset that includes this module.
   * Keep in sync with `MODULE_TIERS` in `packages/config/src/presets.ts`.
   */
  tier: PresetName
}

const REGISTRY: Record<ModuleName, ModuleManifest> = {
  events,
  news,
  pta,
  volunteer,
  fundraising,
  lunch,
  transportation,
  community,
  classroom,
  district,
  resources,
  transparency,
}

/**
 * Returns the ordered list of nav-eligible module manifests for the
 * given school config. Stubs are filtered out from nav even if enabled
 * in config (since they have no pages to link to).
 */
export function getNavModules(config: SchoolConfig): ModuleManifest[] {
  return getEnabledModules(config)
    .map((name) => REGISTRY[name])
    .filter((m) => m.implemented)
}

export function getModuleManifest(name: ModuleName): ModuleManifest {
  return REGISTRY[name]
}
