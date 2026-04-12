# CONTRIBUTING.md — How to Contribute to Schoolyard

Thanks for helping build digital infrastructure for schools. Whether you're fixing a typo, translating a language, or building an entire module — you're making a difference for real school communities.

---

## Quick Start for Developers

### Prerequisites

- **Node.js** >= 20.11 ([download](https://nodejs.org) or use `nvm install`)
- **pnpm** >= 9.x (`corepack enable` activates it automatically)
- **Git**

### Setup

```bash
git clone https://github.com/danweis07/Schoolyard.git
cd Schoolyard
pnpm install
pnpm dev
```

Open `http://localhost:4321` — the Astro dev server has hot reload.

### Recommended IDE Setup

**VS Code** is recommended. When you open the repo, VS Code will prompt you to install recommended extensions. Accept — it configures:

- Astro language support (syntax highlighting, IntelliSense)
- Prettier formatting on save
- ESLint auto-fix on save
- Tailwind CSS class autocompletion (including `.astro` files)
- TypeScript workspace version

See `.vscode/extensions.json` and `.vscode/settings.json` for details.

**JetBrains (WebStorm):** Install the Astro plugin. Prettier and ESLint will be detected automatically from the project config files.

### Verify Your Setup

```bash
pnpm typecheck         # No type errors
pnpm lint              # No lint errors
pnpm format:check      # All files formatted
pnpm validate-config   # school.config.json is valid
pnpm build             # Full build succeeds
pnpm test              # All tests pass
```

If all six pass, you're ready to contribute.

---

## Project Structure at a Glance

```
Schoolyard/
├── apps/web/              Astro web app (the main surface)
│   ├── src/pages/         URL routes (one .astro file per page)
│   ├── src/modules/       One folder per feature module
│   ├── src/content/       Markdown content (events, news, board, etc.)
│   ├── src/components/    Shared Astro components
│   ├── src/layouts/       Page layouts
│   └── src/i18n/          Locale wrappers for the web app
├── apps/mobile/           Expo React Native app (skeleton in v1)
├── packages/
│   ├── config/            school.config.json Zod schema + loader
│   ├── tokens/            Design tokens (Style Dictionary → CSS + RN)
│   ├── i18n/              20-language translation system
│   ├── content-api/       Shared content types for web + mobile
│   └── ui/                Shared React Native components
├── josh/                  FSK Elementary deployment (demo for Josh)
├── cms/                   Decap CMS configuration
├── scripts/               Setup wizard + config validator
├── school.config.json     THE single file every school edits
├── CLAUDE.md              Full platform spec (the authoritative reference)
├── AI.md                  Quick architecture reference for AI agents
├── DEPLOYMENT.md          How to deploy (Netlify/Vercel/GH Pages)
├── ROADMAP.md             What's planned and what's out of scope
└── CONTRIBUTING.md        You are here
```

### Key docs to read first

| File              | Who it's for           | What it covers                              |
| ----------------- | ---------------------- | ------------------------------------------- |
| `README.md`       | Everyone               | Quick start, what's in the box, repo layout |
| `CLAUDE.md`       | AI agents + architects | Full platform spec, every design decision   |
| `AI.md`           | AI agents + developers | Architecture conventions, code patterns     |
| `CONTRIBUTING.md` | Contributors           | Dev setup, PR workflow, how to add features |
| `DEPLOYMENT.md`   | PTA volunteers         | Step-by-step deploy to Netlify/Vercel       |
| `ROADMAP.md`      | Everyone               | What's planned, what's out of scope         |

---

## How the Codebase Works

### The Config-First Architecture

Everything starts with `school.config.json`:

```
school.config.json
    ↓
packages/config/ validates it (Zod schema)
    ↓
apps/web reads it → generates nav, enables modules, injects branding
apps/mobile reads it → configures tabs, theme, features
```

**Rule:** If a school needs to change something, it goes in `school.config.json`. Never add config elsewhere.

### Module System

Each module is a self-contained feature in `apps/web/src/modules/<name>/`:

```
modules/events/
├── index.ts          Module manifest (name, icon, route, enabled)
├── i18n-keys.ts      Required translation keys
├── components/       Module-specific Astro components
└── (pages live in src/pages/<route>/ for Astro routing)
```

**Disabling a module produces zero output.** No pages, no nav links, no bundle bloat. The module check happens at the top of each page file:

```ts
if (!isModuleEnabled(siteConfig, 'events')) {
  return Astro.redirect('/404')
}
```

### Translation System

- `packages/i18n/locales/en.json` is the source of truth
- Never hardcode user-facing strings — always use `t('key.path')`
- Missing keys in other locales fall back to English silently
- Each module declares its required keys in `i18n-keys.ts`

### Design Tokens

- Single source: `packages/tokens/tokens.json`
- `pnpm tokens:build` generates CSS variables + React Native theme
- School colors from `school.config.json` override defaults at runtime
- **Never hardcode colors** — use `text-primary`, `bg-accent`, etc.

---

## Types of Contributions

### Translations (easiest)

1. Copy `packages/i18n/locales/en.json` to `packages/i18n/locales/<code>.json`
2. Translate the values (not the keys)
3. Start with `nav.*` and `common.*` sections — the most visible strings
4. Open a PR

We especially need: `zh-hant`, `ar`, `vi`, `ht`, `so`, `fr`, `ko`, `hi`, `pt`, `am`, `km`, `ur`, `pa`, `sw`, `hmn`.

### Content Fixes (easy)

- Fix typos in demo content (`apps/web/src/content/`)
- Improve alt text, descriptions, or event details
- Add realistic demo content for existing modules

### Bug Fixes (medium)

- Check open issues tagged `bug`
- Write a failing test if possible, then fix
- Run the full check suite before submitting

### New Module Pages (medium)

Seven modules are stubbed and ready for pages: `lunch`, `transportation`, `community`, `classroom`, `district`, `resources`, `transparency`.

Steps to build a module page:

1. Create `apps/web/src/pages/<route>/index.astro`
2. Add the `isModuleEnabled` guard at the top
3. Use `BaseLayout` and the `t()` translation utility
4. Add translation keys to `packages/i18n/locales/en.json` and the module's `i18n-keys.ts`
5. Add demo content to `apps/web/src/content/` if the module has a content collection
6. Add a matching Decap CMS collection in `cms/config.yml` (optional)

### New Features (discuss first)

For anything that changes the config schema, adds a new module, or modifies architecture — open an issue first. See `ROADMAP.md` for what's planned and what's explicitly out of scope.

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm format:check` passes (or run `pnpm format` to fix)
- [ ] `pnpm validate-config` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] `pnpm test:rls` passes (if touching `supabase/migrations/`)
- [ ] New translation keys added to `en.json` first
- [ ] No hardcoded English strings in components
- [ ] No hardcoded colors — uses Tailwind + design tokens
- [ ] Accessible: semantic HTML, ARIA labels, keyboard navigable
- [ ] Mobile-first responsive design (375px minimum)

### PR conventions

- **One module/feature per PR** — keep them focused
- **Commit messages:** imperative present tense ("Add events filter" not "Added events filter")
- **Link issues:** `Closes #N` or `Refs #N` in the PR description
- **Title:** under 70 characters, descriptive

### Branch protection on `main`

The `main` branch has the following protections enabled:

- **Pull request required** — no direct pushes to `main`
- **CI must pass** — the `Build & Test` and `RLS Policy Tests` jobs must both be green
- **Linear history** — use squash or rebase merges, not merge commits
- **No force-push** — history is immutable once merged

#### Branch naming conventions

| Prefix    | Use                       |
| --------- | ------------------------- |
| `feat/`   | New features              |
| `fix/`    | Bug fixes                 |
| `chore/`  | Tooling, CI, dependencies |
| `docs/`   | Documentation only        |
| `claude/` | AI-generated work         |

---

## School-Specific Deployments (josh/ pattern)

The `josh/` folder demonstrates how to create a school-specific deployment package. This pattern lets you maintain school content separately from the platform code:

```
josh/                              # or any school name
├── school.config.fsk.json         # School-specific config
├── setup.sh                       # One-command deploy script
├── README.md                      # School-specific docs
└── content/                       # School-specific content
    ├── board/                     # PTA board members
    ├── events/                    # School events
    ├── news/                      # News posts
    ├── volunteers/                # Volunteer roles
    └── resources/                 # Community resources
```

To create a new school deployment:

1. Copy the `josh/` folder and rename it
2. Edit the config JSON with your school's info
3. Replace content markdown files with your school's content
4. Run `bash setup.sh` to deploy into the platform

---

## Code Style

- **Prettier** formats everything — don't fight it, run `pnpm format`
- **No semicolons**, single quotes, trailing commas (per `.prettierrc.json`)
- **TypeScript strict mode** everywhere
- **Tailwind classes** for styling — no inline styles, no CSS files
- **Astro components** (`.astro`) for web pages — not React (except mobile)
- Keep components simple and readable — boring code over clever abstractions

---

## Getting Help

- **Architecture questions:** Read `CLAUDE.md` (full spec) and `AI.md` (quick reference)
- **Deployment questions:** Read `DEPLOYMENT.md`
- **Stuck on something:** Open an issue or discussion on GitHub
- **AI agents:** `CLAUDE.md` and `AI.md` are written specifically for you — read them fully before generating code
