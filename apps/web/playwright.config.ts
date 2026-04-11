import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for Schoolyard end-to-end smoke tests.
 *
 * Tests run against a production `astro preview` build on a non-default
 * port (4322) so they don't collide with `astro dev` on 4321. The web
 * server is started automatically by Playwright and reused between test
 * runs in local development.
 *
 * Tests live in `e2e/*.spec.ts`. Unit tests (vitest) live in `tests/`
 * and `src/` and use `.test.ts` — there is no glob overlap.
 *
 * Run with: pnpm -F web test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
