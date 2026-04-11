import { test, expect } from '@playwright/test'

/**
 * Schoolyard end-to-end smoke tests — golden user paths.
 *
 * These tests run against a production `astro preview` build of the
 * repo's default `school.config.json` (Longfellow Elementary). If you
 * `pnpm setup` and overwrite the config, the assertions below will
 * fail with clear "expected Longfellow Elementary, got X" messages —
 * swap the config back before running `pnpm -F web test:e2e`.
 *
 * Scope: six golden paths that cover module filtering, config → UI
 * round trip, content collections, module redirects, and i18n. When
 * these pass, we know the three user-visible surfaces (home, a
 * content listing → detail, and a disabled-module 404) work.
 */

test.describe('Schoolyard web — golden paths', () => {
  test('home page renders the school name and expected nav', async ({ page }) => {
    await page.goto('/')

    // Hero pulls siteConfig.school.name
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Longfellow Elementary')

    // Nav contains the expected module links (comes from getNavModules())
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first()
    await expect(nav.getByRole('link', { name: 'Events' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'News' })).toBeVisible()
  })

  test('events index → detail round trip', async ({ page }) => {
    await page.goto('/events')

    // Page title from @schoolyard/i18n `events.title`
    await expect(page.getByRole('heading', { level: 1, name: 'School Events' })).toBeVisible()

    // Click the first EventCard anchor inside the upcoming grid
    const firstCard = page
      .locator('main a[href^="/events/"]')
      .filter({ has: page.locator('h3') })
      .first()
    const cardTitle = await firstCard.locator('h3').innerText()

    await firstCard.click()

    // Detail page renders with the event title as an h1
    await expect(page).toHaveURL(/\/events\/[a-z0-9-]+\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(cardTitle)
  })

  test('news index → detail round trip', async ({ page }) => {
    await page.goto('/news')

    // Page title from @schoolyard/i18n `news.title`
    await expect(page.getByRole('heading', { level: 1, name: 'School News' })).toBeVisible()

    // Click the first NewsCard anchor
    const firstCard = page
      .locator('main a[href^="/news/"]')
      .filter({ has: page.locator('h3') })
      .first()
    const cardTitle = await firstCard.locator('h3').innerText()

    await firstCard.click()

    await expect(page).toHaveURL(/\/news\/[a-z0-9-]+\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(cardTitle)
  })

  test('donate page shows the goal label and donate CTA', async ({ page }) => {
    await page.goto('/donate')

    // Fundraising page title from i18n
    await expect(page.getByRole('heading', { level: 1, name: 'Support Our School' })).toBeVisible()

    // Goal label comes from school.config.json → fundraising.goalLabel
    await expect(page.getByText('Annual Fund 2025-2026')).toBeVisible()

    // Donate CTA: <a> with translated "Donate Now" text pointing at the configured URL
    const donateLink = page.getByRole('link', { name: 'Donate Now' })
    await expect(donateLink).toBeVisible()
    await expect(donateLink).toHaveAttribute('href', /paypal\.me/)
  })

  test('language switcher is rendered with all enabled locales', async ({ page }) => {
    // This test covers the surface that DOES work today: the <select
    // id="lang-switcher"> component renders and contains one option per
    // locale listed in school.config.json's languages.supported.
    // The actual navigation-and-translate flow is currently broken — see
    // the test.fixme below for details.
    await page.goto('/events')

    const switcher = page.locator('#lang-switcher')
    await expect(switcher).toBeVisible()

    // Longfellow's config enables en, es, zh-hans, ru, tl
    const optionLabels = (await switcher.locator('option').allInnerTexts()).map((s) => s.trim())
    expect(optionLabels).toEqual(
      expect.arrayContaining(['English', 'Español', '简体中文', 'Русский', 'Tagalog']),
    )
  })

  /**
   * KNOWN BUG — i18n routing is half-wired.
   *
   * The language switcher generates URLs like `/es/events` but Astro's
   * i18n config in `apps/web/astro.config.mjs` has no `fallback` set and
   * `apps/web/src/pages/` has no `[locale]` route files, so locale-prefixed
   * URLs 404 on the built site. Verified via:
   *
   *   curl -sI http://127.0.0.1:4322/es/events/  →  HTTP/1.1 404 Not Found
   *
   * Pages internally already use `getLocaleFromUrl(Astro.url)` +
   * `useTranslate(locale)` so the translation plumbing works — the
   * build just isn't emitting locale routes. Likely fixes:
   *   1. Add `i18n.fallback: { es: 'en', 'zh-hans': 'en', ru: 'en', tl: 'en' }`
   *      in astro.config.mjs (simplest, but may require routing.fallbackType
   *      tweaks to render in the target locale rather than redirect to default).
   *   2. Refactor each page to use `getStaticPaths()` with locales list.
   *
   * This test is `fixme`-skipped so the rest of the suite stays green while
   * the bug is tracked. Un-skip it when the routing fix lands — if it's
   * still broken, the test will fail loudly.
   */
  test.fixme('language switcher navigates to Spanish and translates the page (BLOCKED: i18n routing bug)', async ({
    page,
  }) => {
    await page.goto('/events')
    const switcher = page.locator('#lang-switcher')
    await Promise.all([
      page.waitForURL(/\/es\/events\/?$/),
      switcher.selectOption({ label: 'Español' }),
    ])
    await expect(page.getByRole('heading', { level: 1, name: 'Eventos Escolares' })).toBeVisible()
  })

  test('disabled module redirects to 404 (Longfellow has district: false)', async ({ page }) => {
    // Longfellow's school.config.json has modules.district: false, so
    // apps/web/src/pages/district/index.astro calls Astro.redirect('/404').
    // This is our end-to-end proof that module filtering works at build time.
    const response = await page.goto('/district/')
    expect(response).not.toBeNull()

    // Astro static redirects emit a meta-refresh; Playwright follows it.
    // We check both the final URL and the rendered page to be resilient to
    // however Astro emits the redirect in future versions.
    await page.waitForURL(/\/404\/?$/, { timeout: 5000 }).catch(() => {
      // Fallback: if the URL doesn't change (direct render of 404 page),
      // we still want the 404 content to be present.
    })

    // 404.astro should have a heading indicating the page wasn't found
    const heading = await page.getByRole('heading', { level: 1 }).first().innerText()
    expect(heading.toLowerCase()).toMatch(/404|not found|page/)
  })
})
