# ROADMAP.md — What's Coming and What's Not

> v1 is intentionally focused. This document lists what we deferred and why.

## v1 Scope (shipped in this monorepo)

- Astro web app, working build
- Single-file `school.config.json` driving everything
- Zod schema and validator
- Style Dictionary design tokens (web CSS + RN theme)
- 5 demo locales populated (en fully, es/zh-hans/ru/tl partial)
- All 12 modules functional: **events, news, pta, volunteer, fundraising, community, lunch, transportation, classroom, district, resources, transparency**
- Progressive onboarding presets (`just-getting-started`, `active-pta`, `full-community-hub`, `district-wide`) in `@schoolyard/config`
- Multi-tenant build driver via `SCHOOLYARD_CONFIG` env var + `pnpm build:school <path>`
- Demo content for Longfellow Elementary, SFUSD
- Runnable Expo mobile skeleton with 5-tab structure
- Documentation: CLAUDE.md (spec), README.md (PTA-friendly), AI.md (architecture), DEPLOYMENT.md (Netlify/Vercel/GH Pages)
- Decap CMS configuration

## v1.x — Near-term follow-ups (welcoming PRs)

- **Deepen the existing modules.** Every module has a working landing page, but richer content types, filters, and exports are welcome. Check individual modules for open feature gaps.
- **Translate the remaining 15 locales.** `packages/i18n/locales/<code>.json` files are needed for: zh-hant, ar, vi, ht, so, hmn, pt, ko, hi, fr, am, km, ur, pa, sw. Start by translating `nav.*` and `common.*`.
- **Real demo images.** Replace placeholder SVGs with royalty-free Unsplash photos. See `apps/web/public/images/demo/CREDITS.md`.
- **Husky pre-commit hooks** wired up for Prettier formatting on staged files.
- **Pagefind search** index on the production build.
- **End-to-end tests** with Playwright for the critical user flows (events list → event detail, donate flow, language switch).

## v2 — Major feature work

- **Mobile feature parity.** Wire each tab to live content from `@schoolyard/content-api`. Add push notifications via Expo Notifications. Add offline mode via Expo SQLite. Add auth via Clerk or Supabase.
- **District module.** Aggregate multiple schools into a single Schoolyard deployment with cross-school events and announcements.
- **Resources auto-localization.** Pull food bank, healthcare, and legal aid listings from a curated dataset, filtered by the school's zip code.
- **Newsletter builder.** Compose newsletters from existing news posts and send via Buttondown or Mailchimp.
- **Volunteer hour tracking export.** Generate CSV/PDF reports for employer volunteer-match programs.
- **Annual report PDF generator.** Auto-build a year-in-review PDF from the year's events, fundraising, and volunteer hours.

---

## Schoolyard Hub (planned, parked)

> Status: **architecture documented, implementation parked** until we have a domain, a pilot school, and committed help.

Schoolyard is designed to serve three kinds of users from the same codebase:

1. **Hosted.** A non-technical PTA parent fills a web form at `schoolyard.org`, picks a preset, and gets a live site — no git, no terminal.
2. **Fork.** A developer clicks "Deploy to Netlify" or runs `pnpm setup`, edits `school.config.json`, and owns their own deployment.
3. **Self-host.** A district IT team or state education department runs their own instance via Docker.

Modes 2 and 3 already work today. Mode 1 — the Hub — is the missing piece.

### Architecture (planned)

The Hub is a thin orchestration layer on top of Core. It never serves school content itself. Per-school static deploys live on the school's own free Netlify/Vercel account (via OAuth), so the Hub's only ongoing cost is the domain (~$15/yr).

```
Schoolyard Hub  (new, apps/hub/ — not yet built)
├─ Public directory of claimed schools
├─ Claim-your-school form + magic-link auth (Resend)
├─ Per-school repo provisioning (GitHub App, bot commits)
├─ OAuth-to-Netlify / OAuth-to-Vercel deploy flow
├─ Minimal in-house editor (school info, events, news, board, goal)
├─ Custom domain / subdomain / link-out management
└─ "Leave Schoolyard" export page (trust signal, ships first)

Runs on: Cloudflare Workers (free) + Neon Postgres (free)
         + Resend (free) + GitHub App (free)
MIT licensed → a state DoE can fork and run their own Hub.
```

Core is already multi-tenant-ready:

- `SCHOOLYARD_CONFIG` env var drives `loadSchoolConfigSync()` at every call site
- `pnpm build:school <path>` builds any config without touching the repo's own `school.config.json`
- `packages/config/src/presets.ts` exposes `resolvePreset()` and `inferPreset()` for the Hub's "pick a tier" flow

### Prereqs to un-park

Implementation is blocked on answers, not code:

1. **A registered domain** for the public Hub (e.g. `schoolyard.org`).
2. **A pilot school** willing to be the first Hub-hosted deployment. Building for "any school" is dramatically slower than building for one real user.
3. **Committed help or explicit "solo is fine."** Phase 3 is several focused sessions of work — Astro SSR on Workers, OAuth flows, GitHub App, editor UI, custom DNS handling.
4. **A sustainability paragraph** in CLAUDE.md answering "who pays when the operator burns out or usage scales past free tiers." "Free forever" is a value, not a plan, until this exists.
5. **A GitHub App vs. Personal Access Token decision** for the bot commits. GitHub App is the right long-term answer; a PAT might be faster for a private pilot.

Until those are answered, building the Hub is premature. Core is ready for it whenever it's time.

### First step when it is time

Before writing any Hub code, ship the **"Leave Schoolyard" export page** as a trust signal: one-click repo export + migration guide. Free-forever promises are only believable if leaving is easy. Core already supports this — each school is its own git repo.

---

## Explicitly NOT in scope (per CLAUDE.md)

These are deliberate non-goals for v1 and v2. They make the platform too complex, too expensive to host, or compromise privacy.

- **Real-time chat or messaging.** Schools have email and Class Dojo. We don't compete.
- **Full web user account system.** Authentication is mobile-only in v1. Web is read-only for parents; editors authenticate through the CMS.
- **Built-in payment processing.** Schoolyard links out to PayPal or Stripe. We don't store payment info or process money. PCI scope is something a volunteer-run organization can't take on.
- **Video hosting.** Use YouTube and embed.
- **Photo gallery with upload.** Privacy concerns around minor photos make this too dangerous to ship without significant policy and moderation infrastructure. Use Smugmug or Google Photos and link out.
- **School performance / test score data.** Out of scope. State and federal sites cover this.
- **Gradebook or SIS integration.** That's the school's IT department's job, not the PTA's.
- **Full district admin dashboard.** v1 surfaces multi-school via the `district` module read-only. A full admin dashboard is enterprise software territory.
- **App Store submission tooling.** v1 is Expo Go only. Production builds can be done by individual schools or districts as needed.
- **AI-powered features.** No LLM-generated content, no AI moderation, no AI summaries. We will not be the platform that hallucinates a school announcement.
- **Advertising or sponsorship systems.** Forever. This is in the architecture, not just the policy.

---

## How to Propose New Features

1. Open a GitHub issue with the **Feature request** template
2. Explain the use case in terms of a real school (not "wouldn't it be cool if...")
3. Show how it fits one of the eight Guiding Principles in CLAUDE.md
4. If you're proposing a new module, draft the manifest and i18n keys in the issue

The fastest way to get a feature in: **build it and open a PR**. Maintainers reserve the right to decline anything that violates the principles, but the bar for additions that fit them is low.
