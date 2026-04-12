import { z } from 'zod'

/**
 * Canonical Zod schema for `school.config.json`.
 * This is the single source of truth for the entire platform.
 * Every config knob a school can change lives here.
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex code (e.g., #1a4f8a)')

export const schoolSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  mascot: z.string().default(''),
  tagline: z.string().default(''),
  address: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  district: z.string().default(''),
  districtUrl: z.string().url().or(z.literal('')).default(''),
  grades: z.string().default(''),
  founded: z.string().default(''),
  enrollment: z.number().int().nonnegative().default(0),
  titleOne: z.boolean().default(false),
  timezone: z.string().default('America/Los_Angeles'),
})

export const ptaSchema = z.object({
  name: z.string().default(''),
  ein: z.string().default(''),
  membershipUrl: z.string().url().or(z.literal('')).default(''),
  membershipFee: z.number().nonnegative().default(0),
})

export const brandingSchema = z.object({
  primaryColor: hexColor.default('#1a4f8a'),
  accentColor: hexColor.default('#f5a623'),
  logo: z.string().default('/images/logo.svg'),
  heroImage: z.string().default('/images/hero.svg'),
  mascotImage: z.string().default(''),
})

export const socialSchema = z.object({
  instagram: z.string().default(''),
  facebook: z.string().default(''),
  twitter: z.string().default(''),
  youtube: z.string().default(''),
})

/**
 * The 20 supported language codes. English is always the source of truth.
 */
export const SUPPORTED_LOCALES = [
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

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const localeSchema = z.enum(SUPPORTED_LOCALES)

export const languagesSchema = z.object({
  default: localeSchema.default('en'),
  supported: z.array(localeSchema).min(1).default(['en']),
})

/**
 * The 12 module names. Adding a module means adding it here AND creating
 * a folder under apps/web/src/modules/<name>/.
 */
export const MODULE_NAMES = [
  'pta',
  'events',
  'volunteer',
  'fundraising',
  'news',
  'lunch',
  'transportation',
  'community',
  'classroom',
  'district',
  'resources',
  'transparency',
] as const

export type ModuleName = (typeof MODULE_NAMES)[number]

export const modulesSchema = z.object({
  pta: z.boolean().default(false),
  events: z.boolean().default(true),
  volunteer: z.boolean().default(false),
  fundraising: z.boolean().default(false),
  news: z.boolean().default(true),
  lunch: z.boolean().default(false),
  transportation: z.boolean().default(false),
  community: z.boolean().default(false),
  classroom: z.boolean().default(false),
  district: z.boolean().default(false),
  resources: z.boolean().default(false),
  transparency: z.boolean().default(false),
})

export const fundraisingSchema = z.object({
  provider: z.enum(['paypal', 'stripe', 'other']).default('paypal'),
  donateUrl: z.string().url().or(z.literal('')).default(''),
  annualGoal: z.number().nonnegative().default(0),
  currentRaised: z.number().nonnegative().default(0),
  goalLabel: z.string().default('Annual Fund'),
  stripePublishableKey: z.string().default(''),
})

/**
 * Resource aggregation settings. Controls which external sources
 * (211.org, USDA, HRSA) are queried and at what radius.
 */
export const RESOURCE_SOURCES = ['211', 'usda', 'hrsa'] as const
export type ResourceSource = (typeof RESOURCE_SOURCES)[number]
export const resourceSourceSchema = z.enum(RESOURCE_SOURCES)

export const resourcesConfigSchema = z.object({
  /** Explicit 5-digit zip code. Falls back to parsing school.address. */
  zipCode: z
    .string()
    .regex(/^\d{5}$/, 'zipCode must be a 5-digit US zip code')
    .optional(),
  /** Which external resource databases to query. */
  sources: z.array(resourceSourceSchema).default(['211']),
  /** Search radius in miles from the zip code centroid. */
  radiusMiles: z.number().positive().default(10),
})

export const appSchema = z.object({
  enabled: z.boolean().default(false),
  pushNotifications: z.boolean().default(false),
  offlineMode: z.boolean().default(true),
})

export const deploymentSchema = z.object({
  siteUrl: z.string().url().or(z.literal('')).default(''),
  analyticsId: z.string().default(''),
})

/**
 * Supabase connection block. Optional — only required when
 * `backend === 'supabase'`. The anon key is safe to expose in client
 * bundles (RLS is the real guard); the service role key NEVER appears
 * here and is loaded from env exclusively by trusted Node scripts.
 */
export const supabaseSchema = z.object({
  url: z.string().url().or(z.literal('')).default(''),
  anonKey: z.string().default(''),
  projectRef: z.string().default(''),
})

/**
 * Backend mode.
 *
 * - `static` — legacy path. `scripts/generate-manifest.ts` writes JSON
 *   files to `apps/web/dist/api/`; `@schoolyard/content-api` reads them
 *   via `fetch()`. Zero backend; still supported during the pivot.
 * - `supabase` — live Postgres behind `@schoolyard/content-api`'s
 *   Supabase adapter. Required for dynamic features (RSVPs, donations,
 *   auth, push, community moderation).
 */
export const BACKEND_MODES = ['static', 'supabase'] as const
export type BackendMode = (typeof BACKEND_MODES)[number]
export const backendModeSchema = z.enum(BACKEND_MODES)

export const announcementSchema = z.object({
  text: z.string().min(1),
  url: z.string().default(''),
  type: z.enum(['info', 'warning', 'urgent']).default('info'),
})

/**
 * Per-school entry inside a district block. Each school gets its own
 * slug, name, and optional overrides for branding/languages/modules.
 * Unset overrides inherit from the root (district) config.
 */
export const tenantSchoolSchema = z.object({
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      'slug must be lowercase letters, numbers, and hyphens only (e.g. "longfellow")',
    ),
  name: z.string().min(1),
  shortName: z.string().min(1),
  active: z.boolean().default(true),
  /** Optional per-school branding override. Inherits from district otherwise. */
  branding: brandingSchema.partial().optional(),
  /** Optional per-school language override. Inherits from district otherwise. */
  languages: languagesSchema.partial().optional(),
  /** Optional per-school module override. Inherits from district otherwise. */
  modules: modulesSchema.partial().optional(),
  /** Optional per-school timezone override. */
  timezone: z.string().optional(),
  /** Optional per-school address/phone/email override. */
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
})

/**
 * District block — present only when a single deployment serves multiple
 * schools. When absent (the default), the platform runs in single-tenant
 * mode and the root config describes the one school.
 */
export const districtSchema = z
  .object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    schools: z.array(tenantSchoolSchema).min(1),
  })
  .optional()

export const schoolConfigSchema = z.object({
  $schema: z.string().optional(),
  school: schoolSchema,
  pta: ptaSchema.default({}),
  branding: brandingSchema.default({}),
  social: socialSchema.default({}),
  languages: languagesSchema.default({}),
  modules: modulesSchema.default({}),
  fundraising: fundraisingSchema.default({}),
  /**
   * External community resource aggregation (211.org, USDA, HRSA).
   * Only consulted when `modules.resources` is enabled.
   */
  resourcesConfig: resourcesConfigSchema.default({}),
  app: appSchema.default({}),
  deployment: deploymentSchema.default({}),
  announcements: z.array(announcementSchema).default([]),
  /**
   * Multi-tenant district block. Omit for single-school deployments.
   */
  district: districtSchema,
  /**
   * Which data source the content-api reads from. Defaults to `static`
   * so existing config files and builds keep working during the pivot.
   * Set to `supabase` once migrations have been applied and the seed
   * script has populated tables for this school.
   */
  backend: backendModeSchema.default('static'),
  /**
   * Supabase connection info — only consulted when `backend === 'supabase'`.
   * Fields may be left empty and sourced from env vars at runtime
   * (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) so the same config.json can
   * target different Supabase projects per environment.
   */
  supabase: supabaseSchema.default({}),
})

export type SchoolConfig = z.infer<typeof schoolConfigSchema>
export type Modules = z.infer<typeof modulesSchema>
export type ResourcesConfig = z.infer<typeof resourcesConfigSchema>
export type TenantSchool = z.infer<typeof tenantSchoolSchema>
export type District = NonNullable<z.infer<typeof districtSchema>>
export type SupabaseConnection = z.infer<typeof supabaseSchema>
