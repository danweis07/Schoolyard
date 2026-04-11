# Schoolyard

> Every school deserves a digital home.

Schoolyard is **open source digital infrastructure for every school community** — multilingual, free, modular, and built for the schools that need it most. Whether you're a one-volunteer rural school or a sophisticated city PTA, Schoolyard scales with you. Turn on only the modules you need; add more as your community grows.

- **Free forever.** MIT licensed. No subscriptions, no premium tiers, no ads.
- **Multilingual from day one.** Built for the 20 most-spoken languages in US schools.
- **Privacy by design.** No tracking, no data harvesting, no ads. COPPA and FERPA aware.
- **Works on slow internet.** Static-first, offline-ready, designed for rural communities.
- **Community-maintained.** Code approachable enough for any volunteer to contribute.

---

## Deploy in one click

The fastest path to a live Schoolyard site: fork, then click one of these. Both hosts offer a free tier that covers a typical school site forever.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/schoolyard-org/schoolyard) [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fschoolyard-org%2Fschoolyard)

After the first deploy, edit `school.config.json` in your fork to customize. Changes auto-deploy on every push. See [DEPLOYMENT.md](./DEPLOYMENT.md) for domain setup and the optional `/admin` editor.

---

## For PTA Parents and School Volunteers (No Coding Required)

**Time required:** 30–60 minutes
**Skills required:** None — if you can edit a Google Doc, you can do this.

### What You Need

1. A free [GitHub](https://github.com) account
2. A free [Netlify](https://netlify.com) or [Vercel](https://vercel.com) account
3. Your school's logo and a hero photo

### Steps

1. **Fork this repo** on GitHub (click the "Fork" button at the top right of the page).
2. **Edit `school.config.json`** with your school's name, colors, and which modules you want enabled. This is the only file most schools ever need to edit.
3. **Replace demo content** in `apps/web/src/content/` with your own announcements, events, and board members. Each piece of content is a simple Markdown file you can edit on github.com directly.
4. **Add your logo and hero image** to `apps/web/public/images/`.
5. **Connect your fork to Netlify or Vercel** by signing in and clicking "Import from GitHub". Pick this repo. They handle the rest.
6. **Your school's site is live** — at a free `*.netlify.app` or `*.vercel.app` URL.

**Optional:** Point your own domain at the site. See [DEPLOYMENT.md](./DEPLOYMENT.md).
**Optional:** Enable the `/admin` panel so non-technical editors can update content from a friendly UI. See [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## For Developers

```bash
git clone https://github.com/schoolyard-org/schoolyard
cd schoolyard
pnpm install
cp school.config.example.json school.config.json   # if needed
pnpm dev
```

The Astro web app starts at `http://localhost:4321`. Hot reload is enabled.

### Useful commands

```bash
pnpm dev               # Start the web app in dev mode
pnpm dev:mobile        # Start the Expo mobile app
pnpm build             # Build all apps and packages
pnpm test              # Run all tests
pnpm lint              # Lint everything
pnpm typecheck         # Type-check all packages
pnpm format            # Auto-format all files with Prettier
pnpm tokens:build      # Rebuild design tokens (web CSS + RN theme)
pnpm validate-config   # Check school.config.json against the schema
pnpm setup:fsk         # Deploy FSK Elementary content (see josh/ folder)
```

### IDE Support

**VS Code:** Open the project and accept the recommended extensions prompt. Formatting, linting, and Astro IntelliSense are configured automatically via `.vscode/settings.json`.

**Other editors:** Respect `.editorconfig`. Run `pnpm format` before committing.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full developer setup.

### Repo layout

```
schoolyard/
├── apps/
│   ├── web/          # Astro web platform (the main site)
│   └── mobile/       # Expo React Native app (cross-platform)
├── packages/
│   ├── config/       # school.config.json schema and loader
│   ├── tokens/       # Design tokens — single source of truth for colors, fonts, spacing
│   ├── i18n/         # 20-language translation system
│   ├── content-api/  # Shared content layer for web and mobile
│   └── ui/           # Shared React components for the mobile app
├── josh/             # FSK Elementary deployment (demo for Josh)
├── cms/              # Decap CMS configuration
├── scripts/          # Setup wizard and config validator
└── school.config.json # ← The one file every school edits
```

### Documentation guide

| File                                 | Audience               | What it covers                            |
| ------------------------------------ | ---------------------- | ----------------------------------------- |
| [README.md](./README.md)             | Everyone               | Quick start, what's in the box            |
| [CLAUDE.md](./CLAUDE.md)             | AI agents + architects | Full platform spec, every design decision |
| [AI.md](./AI.md)                     | AI agents + developers | Architecture conventions, code patterns   |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Developers             | IDE setup, dev workflow, PR checklist     |
| [DEPLOYMENT.md](./DEPLOYMENT.md)     | PTA volunteers         | Netlify / Vercel / GH Pages step-by-step  |
| [ROADMAP.md](./ROADMAP.md)           | Everyone               | What's planned, what's out of scope       |
| [josh/README.md](./josh/README.md)   | Josh / FSK PTA         | FSK-specific content and setup            |

---

## What's in the Box (v1)

**Always present (Core)**

- School identity, branding, and contact
- Multilingual support (20 languages — English fully populated; Spanish, Russian, Tagalog, and Simplified Chinese partial; the remaining 15 have nav/common stubs awaiting community contributions)
- Announcements
- Staff and board directory
- Auto-generated navigation

**Opt-in modules** (enable in `school.config.json`)

- 📅 **Events** — calendar, RSVP, iCal export
- 📰 **News** — Markdown posts, tags, newsletters
- 🏫 **PTA** — board, membership, meetings, committees, newsletters
- 🙋 **Volunteer** — open roles, signups, hour tracking
- 💰 **Fundraising** — annual fund progress, donate links
- 👨‍👩‍👧 **Community** — classifieds, carpool, skill share
- 🍽️ **Lunch** — weekly menus, allergens
- 🚌 **Transportation** — bus routes, stops, schedules
- 📚 **Classroom** — teacher pages, wishlists, reading lists
- 🏛️ **District** — multi-school directory (multi-tenant)
- 🆘 **Resources** — food banks, healthcare, legal aid
- 📊 **Transparency** — public budget, fund allocation

All 12 modules are functional. See [ROADMAP.md](./ROADMAP.md) for what's planned next.

---

## Contributing

Schoolyard is community maintained. The smallest pull request — a typo fix, a missing translation, a new event — is welcome. We especially need:

- **Translators** for the 19 non-English languages (English is fully populated; 4 locales are partial; 15 are nav/common stubs waiting on contributions)
- **PTA volunteers** willing to road-test the platform at their school
- **Designers** to make the demo theme even friendlier
- **Engineers** to deepen the modules (more content types, richer filters, export formats)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full developer setup, PR checklist, and how to add features. See [AI.md](./AI.md) for architecture conventions.

---

## License

MIT. The only thing we ask: keep the footer attribution on every Schoolyard site.

> Built with [Schoolyard](https://github.com/schoolyard-org/schoolyard) — open source for every school.
