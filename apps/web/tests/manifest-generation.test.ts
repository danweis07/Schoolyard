import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from '../../../scripts/generate-manifest'
import type { SchoolConfig } from '@schoolyard/config'
import { schoolConfigSchema } from '@schoolyard/config'
import type { ManifestIndex, ManifestEvent, ManifestNewsPost } from '@schoolyard/content-api'

/**
 * Integration test for the manifest generator. Builds a small fake
 * content tree in a temp directory, runs the generator against it,
 * and verifies the resulting JSON files.
 */

describe('generate-manifest (single-tenant)', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'sy-manifest-'))
    // Minimal content tree
    mkdirSync(join(tempRoot, 'content/events'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/news'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/board'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/volunteers'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/resources'), { recursive: true })
    mkdirSync(join(tempRoot, 'dist/api'), { recursive: true })

    writeFileSync(
      join(tempRoot, 'content/events/fall-fair.md'),
      `---
title: Fall Fair
date: 2026-10-18
description: A fun fall fair for everyone.
category: social
featured: true
---

**Welcome** to the Fall Fair.
`,
    )

    writeFileSync(
      join(tempRoot, 'content/events/movie-night.md'),
      `---
title: Movie Night
date: 2026-11-02
description: Bring blankets.
category: social
---
`,
    )

    writeFileSync(
      join(tempRoot, 'content/news/welcome.md'),
      `---
title: Welcome Back
publishDate: 2026-08-20
summary: A message from the principal.
tags:
  - back-to-school
featured: true
---

Welcome back for another year.
`,
    )

    writeFileSync(
      join(tempRoot, 'content/board/president.md'),
      `---
name: Jamie Rivera
role: President
order: 1
---

Jamie has served for two years.
`,
    )

    writeFileSync(
      join(tempRoot, 'content/volunteers/setup.md'),
      `---
title: Event Setup Crew
description: Help set up chairs and tables.
commitment: 2 hours on Saturday morning
order: 1
---
`,
    )

    writeFileSync(
      join(tempRoot, 'content/resources/food-bank.md'),
      `---
name: Local Food Bank
category: food
description: Provides groceries to families in need.
languages:
  - en
  - es
---
`,
    )
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  function makeConfig(): SchoolConfig {
    return schoolConfigSchema.parse({
      school: {
        name: 'Test Elementary',
        shortName: 'Test',
        tagline: 'Learning together',
        district: 'Test District',
        timezone: 'America/Los_Angeles',
      },
      languages: { default: 'en', supported: ['en', 'es'] },
      modules: {
        pta: false,
        events: true,
        volunteer: true,
        fundraising: false,
        news: true,
        lunch: false,
        transportation: false,
        community: false,
        classroom: false,
        district: false,
        resources: true,
        transparency: false,
      },
    })
  }

  it('generates all expected JSON files', () => {
    run({
      config: makeConfig(),
      contentDir: join(tempRoot, 'content'),
      outDir: join(tempRoot, 'dist/api'),
    })

    const files = [
      'manifest.json',
      'config.json',
      'events.json',
      'news.json',
      'board.json',
      'volunteers.json',
      'resources.json',
    ]
    for (const f of files) {
      const content = readFileSync(join(tempRoot, 'dist/api', f), 'utf8')
      expect(content.length).toBeGreaterThan(0)
      // Every file should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow()
    }
  })

  it('writes a manifest.json with the expected shape', () => {
    run({
      config: makeConfig(),
      contentDir: join(tempRoot, 'content'),
      outDir: join(tempRoot, 'dist/api'),
    })

    const raw = readFileSync(join(tempRoot, 'dist/api/manifest.json'), 'utf8')
    const manifest = JSON.parse(raw) as ManifestIndex

    expect(manifest.version).toBe(1)
    expect(manifest.tenantMode).toBe('single')
    expect(manifest.tenantSlug).toBe('')
    expect(manifest.school.name).toBe('Test Elementary')
    expect(manifest.locales).toEqual(['en', 'es'])
    expect(manifest.enabledModules).toContain('events')
    expect(manifest.enabledModules).toContain('news')
    expect(manifest.counts).toEqual({
      events: 2,
      news: 1,
      board: 1,
      volunteers: 1,
      resources: 1,
    })
    expect(manifest.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('sorts events ascending by date and renders Markdown bodies', () => {
    run({
      config: makeConfig(),
      contentDir: join(tempRoot, 'content'),
      outDir: join(tempRoot, 'dist/api'),
    })

    const events = JSON.parse(
      readFileSync(join(tempRoot, 'dist/api/events.json'), 'utf8'),
    ) as ManifestEvent[]

    expect(events.map((e) => e.slug)).toEqual(['fall-fair', 'movie-night'])
    expect(events[0].htmlBody).toContain('<strong>Welcome</strong>')
    expect(events[0].featured).toBe(true)
    expect(events[1].featured).toBe(false)
  })

  it('sorts news descending by publishDate', () => {
    writeFileSync(
      join(tempRoot, 'content/news/older.md'),
      `---
title: Older Post
publishDate: 2026-06-01
summary: An older post.
---
`,
    )

    run({
      config: makeConfig(),
      contentDir: join(tempRoot, 'content'),
      outDir: join(tempRoot, 'dist/api'),
    })

    const news = JSON.parse(
      readFileSync(join(tempRoot, 'dist/api/news.json'), 'utf8'),
    ) as ManifestNewsPost[]

    expect(news.map((n) => n.slug)).toEqual(['welcome', 'older'])
  })

  it('strips secrets from config.json', () => {
    run({
      config: makeConfig(),
      contentDir: join(tempRoot, 'content'),
      outDir: join(tempRoot, 'dist/api'),
    })

    const raw = readFileSync(join(tempRoot, 'dist/api/config.json'), 'utf8')
    // The sanitized config should not contain any field names we
    // explicitly strip. There aren't any live secret fields today,
    // but this test is a canary for future ones.
    expect(raw).not.toContain('stripeSecretKey')
  })
})

describe('generate-manifest (district mode)', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'sy-manifest-district-'))
    // Shared content (fallback for schools with no per-school content)
    mkdirSync(join(tempRoot, 'content/events'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/news'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/board'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/volunteers'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/resources'), { recursive: true })
    // Per-school content for longfellow
    mkdirSync(join(tempRoot, 'content/schools/longfellow/events'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/schools/longfellow/news'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/schools/longfellow/board'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/schools/longfellow/volunteers'), { recursive: true })
    mkdirSync(join(tempRoot, 'content/schools/longfellow/resources'), { recursive: true })

    writeFileSync(
      join(tempRoot, 'content/schools/longfellow/events/gala.md'),
      `---
title: Longfellow Gala
date: 2026-10-18
description: A special evening.
category: fundraiser
---
`,
    )

    mkdirSync(join(tempRoot, 'dist/api'), { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('emits per-school manifests and a district index', () => {
    const config = schoolConfigSchema.parse({
      school: { name: 'Unified District', shortName: 'Unified' },
      languages: { default: 'en', supported: ['en', 'es'] },
      district: {
        name: 'Unified District',
        shortName: 'Unified',
        schools: [
          { slug: 'longfellow', name: 'Longfellow Elementary', shortName: 'Longfellow' },
          { slug: 'mission-hills', name: 'Mission Hills Middle', shortName: 'Mission Hills' },
        ],
      },
    })

    run({
      config,
      contentDir: join(tempRoot, 'content'),
      outDir: join(tempRoot, 'dist/api'),
    })

    // District index
    const districtRaw = readFileSync(join(tempRoot, 'dist/api/district.json'), 'utf8')
    const district = JSON.parse(districtRaw)
    expect(district.schools).toHaveLength(2)
    expect(district.schools[0].slug).toBe('longfellow')

    // Per-school manifests
    const longfellowRaw = readFileSync(
      join(tempRoot, 'dist/api/schools/longfellow/manifest.json'),
      'utf8',
    )
    const longfellow = JSON.parse(longfellowRaw) as ManifestIndex
    expect(longfellow.tenantMode).toBe('district')
    expect(longfellow.tenantSlug).toBe('longfellow')
    expect(longfellow.school.name).toBe('Longfellow Elementary')
    expect(longfellow.counts.events).toBe(1)

    const missionRaw = readFileSync(
      join(tempRoot, 'dist/api/schools/mission-hills/manifest.json'),
      'utf8',
    )
    const mission = JSON.parse(missionRaw) as ManifestIndex
    expect(mission.tenantSlug).toBe('mission-hills')
    // mission-hills has no per-school content, falls back to shared (which is empty)
    expect(mission.counts.events).toBe(0)
  })
})
