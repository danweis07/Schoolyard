# ROADMAP.md — What's Coming and What's Not

> v1 is intentionally focused. This document lists what we deferred and why.

## v1 Scope (shipped in this monorepo)

- Astro web app, working build
- Single-file `school.config.json` driving everything
- Zod schema and validator
- Style Dictionary design tokens (web CSS + RN theme)
- 5 demo locales populated (en fully, es/zh-hans/ru/tl partial)
- 5 fully-implemented modules: **events, news, pta, volunteer, fundraising**
- 7 stub modules with manifests, ready for community contribution: lunch, transportation, community, classroom, district, resources, transparency
- Demo content for Longfellow Elementary, SFUSD
- Runnable Expo mobile skeleton with 5-tab structure
- Documentation: CLAUDE.md (spec), README.md (PTA-friendly), AI.md (architecture), DEPLOYMENT.md (Netlify/Vercel/GH Pages)
- Decap CMS configuration

## v1.x — Near-term follow-ups (welcoming PRs)

- **Fill in stub modules.** Each of the 7 stubbed modules needs one or two pages, demo content, and translation keys. See `apps/web/src/modules/<name>/README.md` for what to build.
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
