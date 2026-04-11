#!/usr/bin/env tsx
/**
 * Build-time content manifest generator.
 *
 * Walks the Astro content collections and the school config, producing
 * a set of JSON files under `apps/web/dist/api/` that the mobile app
 * and third-party integrations consume over HTTP. Runs after `astro build`
 * and before `pagefind` (see apps/web/package.json).
 *
 * In single-tenant mode the files land at:
 *   apps/web/dist/api/manifest.json
 *   apps/web/dist/api/config.json
 *   apps/web/dist/api/events.json
 *   apps/web/dist/api/news.json
 *   apps/web/dist/api/board.json
 *   apps/web/dist/api/volunteers.json
 *   apps/web/dist/api/resources.json
 *
 * In district mode, the generator additionally emits per-school files
 * under `apps/web/dist/api/schools/<slug>/*.json`, plus a district-level
 * index at `apps/web/dist/api/district.json`.
 *
 * No database, no server, no runtime API — just static files.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isDistrictMode,
  getTenantSlugs,
  resolveTenantConfig,
  getEnabledModules,
} from '@schoolyard/config'
import { loadSchoolConfigSync } from '@schoolyard/config/loader'
import type { SchoolConfig } from '@schoolyard/config'
import type { ManifestIndex } from '@schoolyard/content-api'
import {
  readMarkdownCollection,
  normalizeEvent,
  normalizeNews,
  normalizeBoard,
  normalizeVolunteer,
  normalizeResource,
  sanitizeConfig,
} from './lib/normalizers.js'

// ────────────────────────────────────────────────────────────────────
// Paths
// ────────────────────────────────────────────────────────────────────

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(here, '..')
const WEB_CONTENT = resolve(REPO_ROOT, 'apps/web/src/content')
const WEB_DIST_API = resolve(REPO_ROOT, 'apps/web/dist/api')
const MANIFEST_VERSION = 1

/**
 * The five built-in content collections that the manifest exposes as
 * JSON. Additional collections (committees, programs, lunch, etc.) are
 * used by the web site but are not surfaced in the mobile API in v1.
 */
const CORE_COLLECTIONS = ['events', 'news', 'board', 'volunteers', 'resources'] as const
type CoreCollection = (typeof CORE_COLLECTIONS)[number]

// ────────────────────────────────────────────────────────────────────
// Writers
// ────────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(dirname(filePath))
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function buildManifestIndex(
  config: SchoolConfig,
  tenantSlug: string,
  counts: Record<CoreCollection, number>,
): ManifestIndex {
  // tenantSlug is non-empty only in district mode — derive the mode
  // from the slug rather than checking the (possibly-stripped) config.
  const tenantMode: 'single' | 'district' = tenantSlug ? 'district' : 'single'
  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    tenantMode,
    tenantSlug,
    school: {
      name: config.school.name,
      shortName: config.school.shortName,
      mascot: config.school.mascot,
      tagline: config.school.tagline,
      district: config.school.district,
      timezone: config.school.timezone,
    },
    locales: [...config.languages.supported],
    enabledModules: getEnabledModules(config),
    counts,
  }
}

interface GenerateOptions {
  /** Content root directory (override for district per-school content). */
  contentDir?: string
  /** Output directory (e.g. dist/api or dist/api/schools/<slug>). */
  outDir: string
  /** Effective school config for this tenant. */
  config: SchoolConfig
  /** Tenant slug — empty string for single-tenant mode. */
  tenantSlug: string
}

/**
 * Generates a full set of JSON files for one tenant. Reused by both
 * single-tenant mode (one call) and district mode (one call per school).
 */
function generateTenant(options: GenerateOptions): void {
  const contentDir = options.contentDir ?? WEB_CONTENT

  const eventsRaw = readMarkdownCollection(join(contentDir, 'events'))
  const newsRaw = readMarkdownCollection(join(contentDir, 'news'))
  const boardRaw = readMarkdownCollection(join(contentDir, 'board'))
  const volunteersRaw = readMarkdownCollection(join(contentDir, 'volunteers'))
  const resourcesRaw = readMarkdownCollection(join(contentDir, 'resources'))

  const events = eventsRaw
    .map(normalizeEvent)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const news = newsRaw
    .map(normalizeNews)
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
  const board = boardRaw.map(normalizeBoard).sort((a, b) => a.order - b.order)
  const volunteers = volunteersRaw.map(normalizeVolunteer).sort((a, b) => a.order - b.order)
  const resources = resourcesRaw.map(normalizeResource).sort((a, b) => a.name.localeCompare(b.name))

  const counts: Record<CoreCollection, number> = {
    events: events.length,
    news: news.length,
    board: board.length,
    volunteers: volunteers.length,
    resources: resources.length,
  }

  const index = buildManifestIndex(options.config, options.tenantSlug, counts)
  const sanitized = sanitizeConfig(options.config)

  writeJson(join(options.outDir, 'manifest.json'), index)
  writeJson(join(options.outDir, 'config.json'), sanitized)
  writeJson(join(options.outDir, 'events.json'), events)
  writeJson(join(options.outDir, 'news.json'), news)
  writeJson(join(options.outDir, 'board.json'), board)
  writeJson(join(options.outDir, 'volunteers.json'), volunteers)
  writeJson(join(options.outDir, 'resources.json'), resources)

  // eslint-disable-next-line no-console
  console.log(
    `  ↳ manifest: ${events.length} events, ${news.length} news, ${board.length} board, ${volunteers.length} volunteers, ${resources.length} resources`,
  )
}

// ────────────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────────────

export interface RunOptions {
  /** Override the content root (mostly for tests). */
  contentDir?: string
  /** Override the output root (mostly for tests). */
  outDir?: string
  /** Override the config — mostly for tests; production reads school.config.json. */
  config?: SchoolConfig
}

export function run(options: RunOptions = {}): void {
  const config = options.config ?? loadSchoolConfigSync()
  const outDir = options.outDir ?? WEB_DIST_API
  const contentDir = options.contentDir ?? WEB_CONTENT

  ensureDir(outDir)

  if (!isDistrictMode(config)) {
    // Single-tenant mode: one manifest at the root.
    // eslint-disable-next-line no-console
    console.log(`📦 Generating manifest for single-tenant: ${config.school.name}`)
    generateTenant({ config, outDir, tenantSlug: '', contentDir })
    // eslint-disable-next-line no-console
    console.log(`✅ Manifest written to ${outDir}`)
    return
  }

  // District mode: root manifest lists schools, per-school subdirs.
  const slugs = getTenantSlugs(config)
  // eslint-disable-next-line no-console
  console.log(
    `📦 Generating district manifest for ${config.district?.name ?? 'district'} (${slugs.length} schools)`,
  )

  const districtIndex = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    district: {
      name: config.district?.name ?? '',
      shortName: config.district?.shortName ?? '',
    },
    schools: config.district?.schools.map((s) => ({
      slug: s.slug,
      name: s.name,
      shortName: s.shortName,
      active: s.active,
      manifestUrl: `api/schools/${s.slug}/manifest.json`,
    })),
  }
  writeJson(join(outDir, 'district.json'), districtIndex)

  for (const slug of slugs) {
    const tenantConfig = resolveTenantConfig(config, slug)
    const tenantContent = join(contentDir, 'schools', slug)
    const tenantOut = join(outDir, 'schools', slug)
    // eslint-disable-next-line no-console
    console.log(`  → ${slug} (${tenantConfig.school.name})`)
    generateTenant({
      config: tenantConfig,
      outDir: tenantOut,
      tenantSlug: slug,
      contentDir: existsSync(tenantContent) ? tenantContent : contentDir,
    })
  }

  // eslint-disable-next-line no-console
  console.log(`✅ District manifest written to ${outDir}`)
}

// Only run when invoked directly (not when imported by tests).
const isDirectInvocation = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false
if (isDirectInvocation) {
  try {
    run()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Manifest generation failed:')
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
