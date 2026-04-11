# AI.md — Conventions for AI Coding Agents

> This file orients AI coding agents (Claude, Copilot, Cursor, etc.) and human contributors who want a fast architectural overview. Read [CLAUDE.md](./CLAUDE.md) first for the full spec.

## TL;DR

Schoolyard is a Turborepo monorepo with two apps (Astro web, Expo mobile) and six shared packages (`config`, `tokens`, `i18n`, `content-api`, `supabase`, `ui`). Every school configures the platform via `school.config.json` (branding + modules + locales), and content lives in a shared multi-tenant Supabase project behind RLS. A legacy `static` backend mode still reads Markdown from Git and emits JSON via `scripts/generate-manifest.ts` for deployments that don't want a backend.

## Backend modes

The `SCHOOLYARD_BACKEND` env var picks the data source:

- **`supabase`** (default): all content reads go through `@schoolyard/content-api`'s Supabase adapter → `@schoolyard/supabase` client → Postgres. RLS enforces `school_id` isolation.
- **`static`** (legacy): all content reads go through the static adapter → `fetch()` of `dist/api/*.json` files generated at build time.

Consumers (Astro pages, Expo hooks) should use `createContentClient({ backend, ... })` from `@schoolyard/content-api` — same types for both backends.

## Architecture in One Picture

```
school.config.json  ──┐
                      ├──► @schoolyard/config (Zod schema, loader, tenant helpers)
                      │            │
                      │            ├──► apps/web (Astro, hybrid)
                      │            │      └── middleware → resolveRequestSchool
                      │            └──► apps/mobile (Expo, React Query)
                      │
@schoolyard/tokens ───┤  Style Dictionary → web.css + native.ts
                      │
@schoolyard/i18n   ───┤  20 locales, t() with English fallback
                      │
@schoolyard/content-api
                      ├──► adapters/static.ts   (fetch JSON from dist/api/)
                      └──► adapters/supabase.ts (reads Postgres via client)
                                     │
                                     ▼
@schoolyard/supabase  ──► createBrowserClient / createServerClient
                           / createServiceClient + Database types
                                     │
                                     ▼
                           Supabase Postgres (shared, RLS by school_id)
                           └── districts → schools → content + dynamic tables
```

## Monorepo Layout

| Path                             | Purpose                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| `apps/web/`                      | Astro 5 web app — the primary surface for v1                         |
| `apps/web/src/modules/`          | One folder per module. Add pages here, not in `src/pages/`.          |
| `apps/web/src/content/`          | Astro content collections (Markdown). Schemas in `content/config.ts` |
| `apps/web/src/components/`       | App-wide components (Header, Footer, Hero)                           |
| `apps/web/src/layouts/`          | Astro layouts                                                        |
| `apps/web/src/i18n/`             | Wraps `@schoolyard/i18n` with the current page locale                |
| `apps/mobile/`                   | Expo Router app (React Native)                                       |
| `packages/config/`               | Zod schema, loader, helpers (`getEnabledModules`)                    |
| `packages/tokens/`               | `tokens.json` + Style Dictionary build script                        |
| `packages/i18n/`                 | Locale JSON files + `t()` utility + locale detection                 |
| `packages/content-api/`          | Adapter router — `createContentClient({ backend })`                  |
| `packages/supabase/`             | Typed client factories + generated `Database` types                  |
| `packages/ui/`                   | Shared React Native components                                       |
| `supabase/migrations/`           | Postgres DDL + RLS (0001–0006)                                       |
| `supabase/tests/`                | RLS policy matrix (release-blocking)                                 |
| `supabase/functions/`            | Edge functions (contact-submit, donate, announce, …)                 |
| `cms/config.yml`                 | Decap CMS schema (used only in `static` backend mode)                |
| `scripts/setup.ts`               | Interactive first-time setup wizard                                  |
| `scripts/validate-config.ts`     | Pre-build validation of `school.config.json`                         |
| `scripts/generate-manifest.ts`   | Legacy static manifest writer (backend=static path)                  |
| `scripts/migrate-to-supabase.ts` | Markdown → Postgres seeder (service-role)                            |
| `scripts/lib/normalizers.ts`     | Shared parse + normalize pipeline for both writers                   |

## The Single Source of Truth: `school.config.json`

Every school edits one file. The Zod schema in `packages/config/src/schema.ts` is the canonical definition. **Never add config knobs anywhere else.** If a school needs to customize something, it goes here.

```ts
import { loadSchoolConfig, getEnabledModules } from '@schoolyard/config'

const config = await loadSchoolConfig()
const enabled = getEnabledModules(config) // → ['events', 'news', 'pta', ...]
```

## Design Tokens Flow

1. `packages/tokens/tokens.json` — single source of truth for colors, fonts, radius, spacing
2. `pnpm tokens:build` runs Style Dictionary → emits:
   - `packages/tokens/dist/web.css` — CSS custom properties
   - `packages/tokens/dist/native.ts` — RN theme object
3. School `primaryColor` and `accentColor` from `school.config.json` are injected as CSS custom properties at runtime by `BaseLayout.astro`, **overriding** the placeholder values from `tokens.json`. Mobile reads them through `lib/theme.ts`.

**Never hardcode colors.** Use tokens or CSS variables. Always.

## i18n Rules

- `packages/i18n/locales/en.json` is the source of truth — every key lives here first
- Other locales fall back to English silently for missing keys
- Use the `t()` utility everywhere — never hardcode user-facing strings
- Each module declares its required keys in `i18n-keys.ts`
- School name, mascot, tagline are proper nouns — never translated
- 5 locales are populated in v1: `en`, `es`, `zh-hans`, `ru`, `tl`. The other 15 listed in `LOCALES` are stubs awaiting community PRs.

```ts
import { t } from '@schoolyard/i18n'

const label = t('nav.events', currentLocale)
const greeting = t('common.welcomeName', currentLocale, { name: 'Maria' })
```

## Module System

A module is a folder under `apps/web/src/modules/<name>/` with:

```
modules/events/
├── index.ts          # Manifest: { name, navLabel, icon, route, enabled }
├── i18n-keys.ts      # Required translation keys for this module
├── pages/            # Astro page files copied to src/pages at build time
└── components/       # Astro components used only by this module
```

**Disabling a module produces zero output.** No pages, no nav links, no dead routes. The conditional happens in two places:

1. Module pages live under `src/pages/<route>/...` and check `isModuleEnabled(config, 'name')` at the top of the file. If disabled, they `return Astro.redirect('/404')` — but in practice, schools should toggle modules at config time and rebuild.
2. The header nav iterates `getEnabledModules(config)` to generate links — disabled modules never appear.

### Add a New Module: End-to-End Steps

1. Create `apps/web/src/modules/<name>/` with `index.ts`, `i18n-keys.ts`, `pages/`, `components/`
2. Add the module's boolean to `packages/config/src/schema.ts` under `modules`
3. Add nav label keys to `packages/i18n/locales/en.json`
4. Create one or more `*.astro` pages under `apps/web/src/pages/<route>/`
5. (Optional) Add a content collection in `apps/web/src/content/config.ts` and content under `apps/web/src/content/<name>/`
6. (Optional) Add a Decap CMS collection in `cms/config.yml`
7. Enable the module in `school.config.json` to test

## Content Collections

Schemas in `apps/web/src/content/config.ts` use Zod via Astro's `defineCollection`. Five collections in v1:

- `events`, `news`, `board`, `volunteers`, `resources`

Add a new content type by:

1. Defining a new Zod schema and exporting it from `content/config.ts`
2. Creating the matching folder under `apps/web/src/content/`
3. Adding a Decap CMS collection in `cms/config.yml`

## Mobile (Expo) Conventions

- File-based routing via Expo Router
- Tabs in `app/(tabs)/` are conditional on enabled modules (read at app boot)
- Styling via NativeWind — same Tailwind classes, same tokens
- Demo skeleton only in v1: tabs render placeholders. Full feature wiring is on the roadmap.

## Nav Auto-Generation

`apps/web/src/components/Header.astro` calls `getEnabledModules(config)` and produces nav links from each enabled module's `index.ts` manifest. Schools never edit nav by hand.

## Supabase Conventions

- **All migrations go through `supabase/migrations/*.sql`** and are applied via `supabase db push` or the MCP `apply_migration` tool. Never run ad-hoc DDL against prod.
- **After every DDL change**, run `get_advisors type=security` via MCP or `supabase inspect db advisors` via CLI. Any findings are release-blocking.
- **After every schema change**, regenerate `packages/supabase/src/database.types.ts` via `supabase gen types typescript` and commit the result. Downstream typechecks depend on it.
- **Every query MUST filter by `school_id`** (or a column that transitively references it). RLS is the safety net, not the first line of defense.
- **Never bypass RLS from client code.** Service-role keys only live in `scripts/migrate-to-supabase.ts` and `supabase/functions/**`. Importing `createServiceClient` from any `apps/*` file is a bug.
- **Every new content table mirrors its Astro collection counterpart** so the static and Supabase adapters return identical types. The shape contract lives in `packages/content-api/src/types.ts`.
- **New RLS policies require matching tests** in `supabase/tests/rls.spec.ts`. The test matrix covers `anon`, `member-a`, `editor-a`, `editor-b`, `admin-a`, `district_admin`. Add a row for any new table before merging.
- **Edge functions live under `supabase/functions/<name>/`** and are deployed via `supabase functions deploy <name>` or MCP `deploy_edge_function`.

## What NOT to Change Without Discussion

These are load-bearing architectural choices. Changing them ripples across the whole repo:

- The shape of `school.config.json` (Zod schema)
- The design tokens schema in `tokens.json`
- The set of supported locales in `packages/i18n/src/index.ts`
- The content collection schemas in `apps/web/src/content/config.ts`
- The Supabase schema shape in `packages/supabase/src/database.types.ts` and `supabase/migrations/`
- The `ContentAdapter` interface in `packages/content-api/src/adapters/types.ts`
- The fact that disabled modules produce zero output
- The fact that RLS is enabled on every content and dynamic table

If you have a good reason to change one, open an issue first.

## Common Tasks

### Add a new language

1. Create `packages/i18n/locales/<code>.json` with at least `nav.*` and `common.*` keys
2. Add `<code>` to the `LOCALES` array in `packages/i18n/src/index.ts`
3. Schools enable it by adding `<code>` to `languages.supported` in `school.config.json`

### Add a page within a module

1. Create `apps/web/src/pages/<route>/<page>.astro`
2. At the top, validate the module is enabled and use `<BaseLayout>`
3. Read content via `getCollection('<collection>')` from `astro:content`
4. Add any new translation keys to `en.json` and the module's `i18n-keys.ts`

### Change school branding

Edit `school.config.json` only. The `branding.primaryColor` and `branding.accentColor` flow through CSS custom properties to every component automatically.

### Add a new content type

1. Add a Zod `defineCollection` in `apps/web/src/content/config.ts`
2. Create `apps/web/src/content/<type>/` and add Markdown files
3. Add a matching Decap CMS collection in `cms/config.yml`

## Testing

```bash
pnpm test                 # Run all tests (Vitest + Jest)
pnpm --filter web test    # Just the web tests (Vitest)
pnpm --filter mobile test # Just the mobile tests (Jest)
pnpm typecheck            # Type-check everything
pnpm --filter web build   # Verify Astro build works (catches schema errors)
```

## PR and Commit Conventions

- One module / feature per PR
- Commit messages: imperative present tense ("Add events module" not "Added events module")
- Link issues with `Closes #N` or `Refs #N` in PR descriptions
- Run `pnpm format` and `pnpm lint` before pushing
- New modules must include at least one test or smoke check
- New translation keys must be added to `en.json` first

## Footer Attribution

Every Schoolyard deployment must keep the attribution footer:

> Built with [Schoolyard](https://github.com/schoolyard-org/schoolyard) — open source for every school.

This is enforced by `apps/web/src/components/Footer.astro` and `apps/mobile/components/AboutFooter.tsx`. Don't remove it.
