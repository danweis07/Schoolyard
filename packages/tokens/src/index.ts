/**
 * Public entrypoint for @schoolyard/tokens.
 *
 * Reads tokens.json directly so this package works without a build step.
 * The build script (`pnpm tokens:build`) generates additional artifacts
 * (dist/web.css, dist/native.ts) that the web and mobile apps consume.
 */
import tokensJson from '../tokens.json'

type Leaf = { value: string }
type AnyNode = Leaf | { [key: string]: AnyNode }

function collapse<T>(obj: unknown): T {
  if (obj && typeof obj === 'object' && 'value' in (obj as Record<string, unknown>)) {
    return (obj as Leaf).value as unknown as T
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, AnyNode>)) {
      out[k] = collapse(v)
    }
    return out as T
  }
  return obj as T
}

export interface Tokens {
  color: {
    primary: string
    accent: string
    surface: string
    muted: string
    border: string
    text: { base: string; muted: string; inverse: string }
    success: string
    warning: string
    error: string
  }
  font: {
    family: { sans: string }
    size: {
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
      '4xl': string
    }
  }
  radius: { card: string; button: string; full: string }
  spacing: { section: string; card: string }
}

export const tokens: Tokens = collapse<Tokens>(tokensJson)
