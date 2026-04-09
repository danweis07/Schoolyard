/**
 * Mobile-side school config loader.
 *
 * Reads school.config.json from the monorepo root at bundle time.
 * Metro's resolver follows the workspace symlink so this just works.
 */
import schoolConfigJson from '../../../school.config.json'
import { schoolConfigSchema } from '@schoolyard/config'
import type { SchoolConfig } from '@schoolyard/config'

const parsed = schoolConfigSchema.safeParse(schoolConfigJson)

if (!parsed.success) {
  throw new Error(
    'school.config.json failed validation: ' +
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
  )
}

export const siteConfig: SchoolConfig = parsed.data
