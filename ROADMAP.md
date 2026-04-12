# ROADMAP.md — What's Coming and What's Not

> Schoolyard recently pivoted to a Supabase-backed multi-tenant architecture. The original "non-technical PTA parent edits markdown" path still works via the legacy `static` backend, but the default path is now `SCHOOLYARD_BACKEND=supabase`. This file reflects the post-pivot state.

## v1 Scope — what shipped

### Monorepo foundations

- Turborepo + pnpm, TypeScript strict, ESLint, Prettier, Husky, CI
- `school.config.json` — Zod schema, loader, presets, district support
- `pnpm build:school <path>` multi-tenant build driver
- 4 onboarding presets: `just-getting-started`, `active-pta`, `full-community-hub`, `district-wide`
- Style Dictionary design tokens → web CSS vars + RN theme, runtime color overrides
- 20 locales (11 full-coverage, 9 essentials-only)

### Web — 12 modules, component parity

All 12 modules now follow the same shape: `modules/<name>/index.ts` manifest + `i18n-keys.ts` + `components/` folder + pages under `src/pages/[...locale]/<route>/`.

- **events** — listings, detail, per-event `.ics`, `calendar.ics`
- **news** — listings, detail, per-tag RSS
- **pta** — board, committees, meetings, membership, newsletters, enrichment, budget
- **volunteer** — role listings, detail
- **fundraising** — progress bar, donate CTA, aggregate view wired in Supabase mode
- **community** — listing card, category filter, flag button (stub for Phase 6)
- **lunch** — weekly menu card, allergen badge
- **transportation** — route card, stop list
- **classroom** — teacher card, wishlist/reading-list sections
- **district** — school card, district header, multi-school aggregation
- **resources** — resource card, category + language badges
- **transparency** — budget-year card, line-item table, year-over-year variance

### Backend (Supabase-backed, new in this pivot)

- `packages/supabase/` — typed client factories (`createBrowserClient`, `createServerClient`, `createServiceClient`)
- `supabase/migrations/0001…0006.sql` — tenant, content, dynamic state, RLS, indexes, functions + triggers
- 14 content tables mirroring existing Astro collections (events, news, board_members, volunteer_roles, resources, lunch_menus, transportation_routes, community_listings, classroom_teachers, budget_years, committees, programs, pta_newsletters) + schools / districts
- 8 dynamic tables: `profiles`, `event_rsvps`, `fundraising_donations`, `contact_submissions`, `volunteer_hours`, `community_flags`, `push_tokens`, `announcements`
- RLS on every table, keyed on `school_id`; role hierarchy `member → editor → admin → district_admin`
- `fundraising_program_totals` aggregate view (donations never selectable directly)
- `handle_new_user()` trigger auto-creates a profile row on signup
- `packages/content-api/src/adapters/{static,supabase}.ts` — dual backends, identical types
- `createContentClient({ backend })` router
- `scripts/migrate-to-supabase.ts` — idempotent Markdown → Postgres seeder (service-role)
- `scripts/lib/normalizers.ts` — shared parse + normalize pipeline used by both static manifest writer and migrator

### Mobile

- Expo + Expo Router + NativeWind, 5-tab structure, already wired to `@schoolyard/content-api`
- React Query + Supabase client + auth + offline cache land in Phase 7

### Tests & docs

- Vitest unit tests, Playwright E2E (7 golden paths), content-api dual-adapter tests
- CLAUDE.md, AI.md, DEPLOYMENT.md updated for the pivot
- New `BACKEND.md` — schema reference, RLS cheat sheet, admin workflows, edge-function index

## v0.1.0 — Shipping preparations (in progress)

### Release infrastructure

- [x] RLS test matrix (`supabase/tests/rls.spec.ts`) — release-blocking, wired into CI
- [x] Env validation at startup (fail-fast if `SUPABASE_URL` / `SUPABASE_ANON_KEY` missing)
- [x] SECURITY.md + vulnerability reporting policy
- [x] Branch protection rules documented in CONTRIBUTING.md
- [x] GitHub community files (issue/PR templates, CoC, dependabot)
- [ ] Changesets for versioning + CHANGELOG
- [ ] Deployment workflow (preview deploys on PRs, auto-deploy on merge)
- [ ] Lighthouse CI enforcement (95+ perf, 100 a11y, 100 best practices)

### Mobile features for v0.1.0

- [ ] Live data wiring (React Query hooks for all 5 tabs)
- [ ] Push notifications (broadcast per school via Expo Notifications)
- [ ] Offline mode (SQLite-backed React Query persister)

### Web features for v0.1.0

- [ ] Admin route → Supabase Studio (thin redirect, not full editor)
- [ ] Donor wall + live fundraising progress on fundraising module page

### Deferred to v1.0

- Phase 4: Hybrid mode middleware + subdomain/path routing (partially done)
- Phase 6: Auth client islands (RsvpButton, HoursLogForm, FlagButton, DonateForm)
- Phase 7: Mobile magic-link auth

### Translation backlog

- 9 Tier-2 locales need ~170 more keys each to reach Tier-1 parity
- RTL visual verification for `ar` and `ur`

### Content polish

- Swap placeholder SVGs for real Unsplash photos + update `apps/web/public/images/demo/CREDITS.md`
- Add a third-school config to stress-test multi-tenancy harder

## v2 — Major feature work

- **District aggregated calendar + announcements** via `district_id` on dynamic tables
- **Newsletter module** — compose from news posts, send via Buttondown or Mailchimp
- **Volunteer hour reports** — CSV + PDF for employer match programs
- **Annual report PDF generator** — auto-compile year-in-review from events + fundraising + volunteer hours
- **Grants module** — filter US federal/state/foundation grants by school profile
- **Emergency module** — SMS alerts via Twilio, offline-first
- **Resources auto-localization** — pull food bank / healthcare / legal aid listings from a curated dataset filtered by ZIP
- **NCES integration** — seed school profiles from public data
- **Mobile EAS production builds**, App Store + Play Store submission tooling

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
