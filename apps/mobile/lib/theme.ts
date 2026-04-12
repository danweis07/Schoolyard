/**
 * Mobile theme — wraps @schoolyard/tokens. School-specific branding
 * overrides (primaryColor, accentColor) are now applied at runtime
 * via the useTheme hook, since the school is selected dynamically.
 *
 * The static `theme` export uses the default token colors and is
 * suitable for screens that render before a school is selected
 * (e.g. the school picker).
 */
import { tokens } from '@schoolyard/tokens'

/** Default theme using token colors (no school branding applied). */
export const theme = {
  ...tokens,
  color: {
    ...tokens.color,
    primary: tokens.color.primary,
    accent: tokens.color.accent,
  },
}

export type Theme = typeof theme

/**
 * Returns a theme with the selected school's branding colors applied.
 * Call this inside components that have access to the school context.
 */
export function getSchoolTheme(primaryColor?: string, accentColor?: string): Theme {
  return {
    ...tokens,
    color: {
      ...tokens.color,
      primary: primaryColor ?? tokens.color.primary,
      accent: accentColor ?? tokens.color.accent,
    },
  }
}
