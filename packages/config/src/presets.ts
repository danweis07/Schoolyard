import type { ModuleName, Modules } from './schema.js'

/**
 * Progressive onboarding presets.
 *
 * A preset is a named bundle of modules that matches a common school profile.
 * Schools pick a preset at setup time and can toggle individual modules later.
 * The Hub (apps/hub/) uses these to drive its "add a module" flow — checking
 * a tier in the editor enables all modules in that tier at once.
 *
 * Tiers are cumulative: `active-pta` includes everything in `just-getting-started`,
 * `full-community-hub` includes everything in `active-pta`, and so on. Picking a
 * higher tier never un-enables a module from a lower tier.
 *
 * This is the canonical source of truth for module → tier mapping. Module
 * manifests in `apps/web/src/modules/<name>/index.ts` mirror this via their
 * `tier` field; keep them in sync. The `presets.test.ts` file verifies the
 * mapping is exhaustive.
 */

export const PRESET_NAMES = [
  'just-getting-started',
  'active-pta',
  'full-community-hub',
  'district-wide',
] as const

export type PresetName = (typeof PRESET_NAMES)[number]

/**
 * Human-readable description for each preset. Used by the setup wizard and
 * (eventually) the Hub editor.
 */
export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  'just-getting-started':
    'Home, news, and events. The minimum a school needs to have a web presence.',
  'active-pta':
    'Adds PTA pages, a volunteer board, and fundraising. For schools with an active parent organization.',
  'full-community-hub':
    'Adds community classifieds, lunch menus, classroom pages, and a resources directory. For schools that want their site to be the daily hub.',
  'district-wide':
    'Adds multi-school district mode, budget transparency, and transportation. For districts or very active schools.',
}

/**
 * The tier each module belongs to. A module's tier means "the smallest preset
 * that includes this module." Presets are cumulative, so a module in
 * `just-getting-started` is also in every higher preset.
 */
export const MODULE_TIERS: Record<ModuleName, PresetName> = {
  // just-getting-started
  news: 'just-getting-started',
  events: 'just-getting-started',
  // active-pta
  pta: 'active-pta',
  volunteer: 'active-pta',
  fundraising: 'active-pta',
  'spirit-store': 'active-pta',
  directory: 'active-pta',
  forms: 'active-pta',
  conferences: 'active-pta',
  // full-community-hub
  community: 'full-community-hub',
  lunch: 'full-community-hub',
  classroom: 'full-community-hub',
  resources: 'full-community-hub',
  // district-wide
  district: 'district-wide',
  transparency: 'district-wide',
  transportation: 'district-wide',
}

/**
 * Preset rank — higher number means "more modules." Used to determine
 * cumulative inclusion.
 */
const PRESET_RANK: Record<PresetName, number> = {
  'just-getting-started': 0,
  'active-pta': 1,
  'full-community-hub': 2,
  'district-wide': 3,
}

/**
 * Returns the set of modules enabled by a given preset, as a complete
 * `Modules` record (every module name → boolean).
 */
export function resolvePreset(preset: PresetName): Modules {
  const targetRank = PRESET_RANK[preset]
  const modules = {} as Modules
  for (const [name, tier] of Object.entries(MODULE_TIERS) as [ModuleName, PresetName][]) {
    modules[name] = PRESET_RANK[tier] <= targetRank
  }
  return modules
}

/**
 * Returns the list of module names included in a preset, in manifest order.
 */
export function getPresetModules(preset: PresetName): ModuleName[] {
  const targetRank = PRESET_RANK[preset]
  return (Object.entries(MODULE_TIERS) as [ModuleName, PresetName][])
    .filter(([, tier]) => PRESET_RANK[tier] <= targetRank)
    .map(([name]) => name)
}

/**
 * Given an enabled-modules record, returns the smallest preset that covers
 * all of them (or undefined if the modules don't match any clean preset).
 * Useful for the Hub's "which preset am I currently on?" display.
 */
export function inferPreset(modules: Modules): PresetName | undefined {
  for (const preset of PRESET_NAMES) {
    const expected = resolvePreset(preset)
    if ((Object.keys(expected) as ModuleName[]).every((name) => expected[name] === modules[name])) {
      return preset
    }
  }
  return undefined
}
