/**
 * Mobile theme — wraps @schoolyard/tokens with school branding overrides
 * pulled from school.config.json.
 */
import { tokens } from '@schoolyard/tokens'
import { siteConfig } from './config'

export const theme = {
  ...tokens,
  color: {
    ...tokens.color,
    // Override defaults with school's branding colors
    primary: siteConfig.branding.primaryColor,
    accent: siteConfig.branding.accentColor,
  },
}

export type Theme = typeof theme
