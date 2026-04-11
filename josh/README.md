# FSK Schoolyard — Josh's Deployment

> Francis Scott Key Elementary PTA — powered by [Schoolyard](../README.md).

This folder contains everything needed to run the Schoolyard platform as the **Francis Scott Key Elementary PTA** site. One command deploys FSK content over the default Longfellow demo.

---

## What's included

```
josh/
├── school.config.fsk.json          # FSK school configuration
├── setup.sh                        # One-command setup script
├── README.md                       # You are here
└── content/
    ├── board/                      # 7 PTA board members
    │   ├── jennifer-lam.md         #   President
    │   ├── michael-torres.md       #   Vice President
    │   ├── anna-chen.md            #   Treasurer
    │   ├── priya-sharma.md         #   Secretary
    │   ├── david-okafor.md         #   Fundraising Chair
    │   ├── lisa-wong.md            #   Volunteer Coordinator
    │   └── carlos-rivera.md        #   Enrichment Programs Chair
    ├── events/                     # 7 school events
    │   ├── fall-festival.md        #   Sep — kickoff celebration
    │   ├── movie-night.md          #   Oct — family movie night
    │   ├── halloween-celebration.md #  Oct — costume parade
    │   ├── winter-ball.md          #   Dec — holiday dance
    │   ├── lunar-new-year.md       #   Jan — cultural celebration
    │   ├── spring-gala.md          #   Mar — $100K fundraiser
    │   └── passport-day.md         #   Apr — international night
    ├── news/                       # 4 news posts
    ├── volunteers/                 # 5 volunteer roles
    └── resources/                  # 5 Sunset District community resources
```

---

## Quick Start (5 minutes)

### Prerequisites

- **Node.js** >= 20.11 (check: `node -v`)
- **pnpm** >= 9.x (enable: `corepack enable`)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/danweis07/Schoolyard.git
cd Schoolyard
pnpm install

# 2. Deploy FSK content
cd josh
bash setup.sh          # Replaces Longfellow demo with FSK content
cd ..

# 3. Run the dev server
pnpm dev               # Opens at http://localhost:4321
```

That's it. You should see the FSK PTA site with red/navy branding, 7 events, and all enhanced PTA features.

---

## IDE Setup

### VS Code (recommended)

The repo includes `.vscode/settings.json` and `.vscode/extensions.json`. When you open the project, VS Code will prompt you to install recommended extensions:

| Extension                 | What it does                                         |
| ------------------------- | ---------------------------------------------------- |
| Astro                     | Syntax highlighting, IntelliSense for `.astro` files |
| Prettier                  | Auto-formats on save (matches `.prettierrc.json`)    |
| ESLint                    | Lints TypeScript and Astro files                     |
| Tailwind CSS IntelliSense | Class autocomplete in templates                      |

After installing extensions, formatting and linting happen automatically on save.

### JetBrains / WebStorm

Install the Astro plugin from the JetBrains marketplace. Prettier and ESLint are detected automatically from project config files.

### Any other editor

Respect `.editorconfig` (UTF-8, LF line endings, 2-space indent). Run `pnpm format` before committing.

---

## Developer Workflow

### Everyday commands

```bash
pnpm dev               # Start dev server with hot reload
pnpm build             # Full production build
pnpm test              # Run all tests
pnpm lint              # Check for lint errors
pnpm typecheck         # TypeScript type checking
pnpm format            # Auto-format all files
pnpm validate-config   # Validate school.config.json
```

### Editing content

All content lives in Markdown files under `apps/web/src/content/`. After running `setup.sh`, these contain FSK content. Edit them directly — the dev server hot-reloads.

| Content type  | Path                                   | Frontmatter fields                                           |
| ------------- | -------------------------------------- | ------------------------------------------------------------ |
| Board members | `apps/web/src/content/board/*.md`      | name, role, email, bio, termStart, termEnd, order            |
| Events        | `apps/web/src/content/events/*.md`     | title, date, time, location, description, category, featured |
| News          | `apps/web/src/content/news/*.md`       | title, publishDate, author, summary, tags, featured          |
| Volunteers    | `apps/web/src/content/volunteers/*.md` | title, description, commitment, contact, filled, order       |
| Resources     | `apps/web/src/content/resources/*.md`  | name, category, description, address, phone, url, languages  |

### Editing school config

`school.config.json` at the repo root controls everything: school name, branding colors, enabled modules, fundraising goals, languages, and social links. The Zod schema at `packages/config/src/schema.ts` is the canonical definition.

---

## What's Different from Default Longfellow Demo

| Feature          | Longfellow (default)                | FSK (this folder)                                   |
| ---------------- | ----------------------------------- | --------------------------------------------------- |
| School           | Longfellow Elementary, 320 students | Francis Scott Key Elementary, 562 students          |
| Branding         | Blue (#1a4f8a) + Gold (#f5a623)     | Red (#b22234) + Navy (#3c3b6e)                      |
| Languages        | en, es, zh-hans, ru, tl             | en, es, zh-hans, zh-hant, ru, tl                    |
| Fundraising goal | $45,000                             | $100,000                                            |
| Board members    | 6                                   | 7 (includes Enrichment Chair)                       |
| Events           | 6 generic                           | 7 FSK-specific (Gala, Lunar New Year, Passport Day) |
| Modules enabled  | 5                                   | 8 (adds lunch, community, resources, transparency)  |
| Social media     | None                                | Instagram + Facebook                                |
| Resources        | Generic SF                          | Sunset District specific                            |

---

## Enhanced PTA Features

This branch adds three new PTA sub-pages to the platform (available to all schools, not just FSK):

### /pta/committees

Six PTA committees with descriptions, meeting schedules, and join instructions:

- Events, Fundraising, Communications, Enrichment, Volunteer Coordination, Community & Inclusion

### /pta/newsletters

Monthly newsletter archive with current-issue badge. Email signup CTA.

### /pta/enrichment

Five PTA-funded programs with budget breakdowns and donate CTA:

- STEAM Residencies ($30K), Garden Program ($20K), After-School ($15K), Lunch & Recess ($15K), Books & Supplies ($15K)

---

## Deploying to Production

```bash
pnpm build    # Builds the static site to apps/web/dist/
```

Deploy `apps/web/dist/` to any static host. See [DEPLOYMENT.md](../DEPLOYMENT.md) for step-by-step instructions for Netlify, Vercel, and GitHub Pages.

---

## Troubleshooting

**`pnpm install` fails** — Make sure you're on Node >= 20.11 and pnpm >= 9.x. Run `corepack enable` if pnpm isn't found.

**Build fails with Zod errors** — Run `pnpm validate-config` to see what's wrong in `school.config.json`. Common issues: missing fields, bad hex color codes.

**Content changes don't appear** — The Astro dev server hot-reloads most changes, but content collection schema changes require a server restart (`Ctrl+C`, then `pnpm dev`).

**setup.sh won't run on Windows** — Use Git Bash, WSL, or manually copy the files as described in the script.

**Modules show 404** — Check that the module is set to `true` in `school.config.json` under `modules`.

---

## Creating Your Own School Deployment

The `josh/` folder is an example of the **overlay pattern** — a one-off template-switch that replaces the repo's default demo content with a specific school's content in place. Use it when:

- You're running a single-tenant deployment and want to swap the demo for your school permanently
- You're developing locally and want a known reference build

### Two patterns, same substrate

Schoolyard supports two ways to drive Core with an external config. Pick whichever fits your situation:

1. **Overlay pattern (this folder).** Destructive: `setup.sh` copies files into `apps/web/src/content/` and replaces `school.config.json` at the repo root. Best for a single school that wants to own the checkout. Only one school can be "active" at a time.
2. **External config pattern** (Phase 2 hardening, no destructive copies). Run `pnpm build:school <path-to-config.json>` — the build spawns with `SCHOOLYARD_CONFIG` set, so every `loadSchoolConfigSync()` call site picks up that config. The repo's own `school.config.json` is left untouched. Best for the Hub, for CI that builds many schools from one git tree, and for district deployments. Requires each school's content to live somewhere the Astro build can find it (either via content-directory overrides or a per-school checkout).

### Using the overlay pattern for your own school

1. Copy `josh/` to `your-school/`
2. Edit `school.config.fsk.json` → rename to `school.config.yourschool.json`
3. Replace content in `content/` with your school's info
4. Update `setup.sh` to reference your new config filename
5. Run `bash setup.sh` and `pnpm dev`

### Using the external config pattern for your own school

```bash
# Validate your config first
SCHOOLYARD_CONFIG=./path/to/your-school.config.json pnpm validate-config

# Build without touching the repo's school.config.json
pnpm build:school ./path/to/your-school.config.json
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full developer guide.

---

## Further Reading

| Doc                                   | What it covers                                        |
| ------------------------------------- | ----------------------------------------------------- |
| [README.md](../README.md)             | Project overview and quick start                      |
| [CLAUDE.md](../CLAUDE.md)             | Full platform spec — the authoritative reference      |
| [AI.md](../AI.md)                     | Architecture conventions for AI agents and developers |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Developer setup, PR workflow, how to add features     |
| [DEPLOYMENT.md](../DEPLOYMENT.md)     | Deploy to Netlify, Vercel, or GitHub Pages            |
| [ROADMAP.md](../ROADMAP.md)           | What's planned and what's out of scope                |
