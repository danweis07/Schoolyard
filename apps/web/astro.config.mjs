// @ts-check
import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'
import { loadSchoolConfigSync } from '@schoolyard/config/loader'

const schoolConfig = loadSchoolConfigSync()
const site = schoolConfig.deployment.siteUrl || 'https://example.org'

/**
 * Astro config — i18n locales come from school.config.json so schools
 * never edit this file. Build the site, get translated routes for free.
 */
export default defineConfig({
  site,
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
    icon({
      include: {
        heroicons: ['*'],
      },
    }),
  ],
  i18n: {
    defaultLocale: schoolConfig.languages.default,
    locales: [...schoolConfig.languages.supported],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  trailingSlash: 'ignore',
  compressHTML: true,
})
