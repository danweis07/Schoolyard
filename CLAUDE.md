# CLAUDE.md — Schoolyard Platform Spec

> This file is the authoritative spec for AI coding agents working on the Schoolyard project.
> Read this fully before writing any code. Do not deviate from the architecture described here.

---

## Vision

**Name:** Schoolyard
**Tagline:** Every school deserves a digital home.
**Mission:** Open source digital infrastructure for every school community — multilingual, free, modular, and built for the schools that need it most.
**License:** MIT
**Type:** Civic tech / nonprofit open source platform

Schoolyard is not a website template. It is a **modular platform** — a digital infrastructure layer that any school community can deploy, configure, and grow into over time. A rural school with one volunteer uses two modules. A sophisticated city PTA uses all of them.

The SF school PTA community is the reference demo implementation. The architecture serves every American school — and eventually every school globally.

---

## Platform Architecture Overview

Schoolyard has three layers:

```
┌─────────────────────────────────────────────────────┐
│                  SCHOOLYARD PLATFORM                 │
├─────────────────────────────────────────────────────┤
│  CORE (always present)                               │
│  School identity · Multilingual · Branding           │
│  Announcements · Staff directory · Contact           │
├─────────────────────────────────────────────────────┤
│  MODULES (opt-in via school.config.json)             │
│  PTA · Events · Volunteer · Fundraising · News       │
│  Lunch · Transportation · Community · Classroom      │
│  District · Resources · Transparency                 │
├─────────────────────────────────────────────────────┤
│  SURFACES                                            │
│  Web (Astro) · Mobile App (React Native / Expo)      │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Web Platform

| Layer     | Choice                           | Reason                                            |
| --------- | -------------------------------- | ------------------------------------------------- |
| Framework | Astro                            | Fast, static-first, no database, non-dev friendly |
| Styling   | Tailwind CSS + Design Tokens     | Consistent theming, school-level customization    |
| CMS       | Decap CMS (formerly Netlify CMS) | Git-based, no backend, works anywhere             |
| Hosting   | Vercel or Netlify (free tier)    | One-click deploy, free, reliable                  |
| Content   | Markdown + JSON config           | Human-editable, version controlled                |
| i18n      | Astro i18n + JSON locale files   | 20+ languages, community-contributed              |
| Icons     | Astro Icon + Heroicons           | Lightweight, accessible                           |
| Forms     | Netlify Forms or Formspree       | No backend required                               |
| Fonts     | Inter (body) + system fallbacks  | Fast, readable, accessible                        |
| Search    | Pagefind                         | Static, no server, fast                           |

### Mobile App

| Layer              | Choice                        | Reason                                      |
| ------------------ | ----------------------------- | ------------------------------------------- |
| Framework          | React Native + Expo           | Cross-platform iOS/Android, large community |
| Navigation         | Expo Router                   | File-based routing, web-familiar            |
| Styling            | NativeWind (Tailwind for RN)  | Shared design token system with web         |
| State              | Zustand                       | Lightweight, simple                         |
| Data               | React Query + school JSON API | Pulls from same content as web              |
| Push Notifications | Expo Notifications            | Cross-platform, free                        |
| Offline            | Expo SQLite + background sync | Works on poor connections                   |
| Auth               | Clerk or Supabase Auth        | Simple, free tier                           |
| Analytics          | PostHog (self-hostable)       | Privacy-respecting, open source             |

### Shared

| Layer           | Choice                                                             |
| --------------- | ------------------------------------------------------------------ |
| Design Tokens   | Style Dictionary — single source generates web CSS vars + RN theme |
| Content API     | School config + Markdown → JSON API consumed by both web and app   |
| Monorepo        | Turborepo — web, app, shared packages in one repo                  |
| Package Manager | pnpm                                                               |
| TypeScript      | Everywhere                                                         |
| Linting         | ESLint + Prettier                                                  |
| Testing         | Vitest (web) + Jest (app)                                          |

---

## Monorepo Structure

```
schoolyard/
├── CLAUDE.md                        # This file
├── README.md                        # Getting started for non-technical users
├── AI.md                            # AI agent conventions and architecture notes
├── DEPLOYMENT.md                    # Step-by-step deployment guide
├── ROADMAP.md                       # v2+ features (do not build in v1)
├── LICENSE                          # MIT
├── school.config.json               # Single config file schools edit to customize
├── package.json
├── turbo.json                       # Turborepo config
├── pnpm-workspace.yaml
│
├── apps/
│   ├── web/                         # Astro web platform
│   │   ├── astro.config.mjs
│   │   ├── tailwind.config.mjs
│   │   ├── public/
│   │   └── src/
│   │       ├── components/          # Astro components
│   │       ├── layouts/
│   │       ├── pages/
│   │       ├── content/             # Markdown content collections
│   │       ├── i18n/                # Locale JSON files
│   │       └── modules/             # One folder per module
│   │
│   └── mobile/                      # React Native / Expo app
│       ├── app.json
│       ├── app/                     # Expo Router file-based routes
│       ├── components/
│       ├── hooks/
│       └── lib/
│
├── packages/
│   ├── config/                      # school.config.json loader + validator
│   ├── tokens/                      # Design tokens — single source of truth
│   ├── i18n/                        # Shared translation system
│   ├── content-api/                 # Shared content layer
│   └── ui/                          # Shared React components (mobile)
│
├── cms/
│   └── config.yml                   # Decap CMS configuration
│
└── scripts/
    ├── setup.js                     # Interactive first-time setup wizard
    └── validate-config.js           # Validates school.config.json before build
```

---

## school.config.json

The single file every school edits. No other file should need editing for basic setup.
This is the source of truth for both web and mobile.

See `school.config.example.json` in the repo root for the full shape.
The Zod schema in `packages/config/src/schema.ts` is the canonical definition.

---

## Modules Specification

Each module lives in `apps/web/src/modules/[name]/` and contains:

- `pages/` — Astro page(s) for this module
- `components/` — module-specific components
- `i18n-keys.ts` — required translation keys
- `index.ts` — module manifest (name, nav label, icon, route, enabled)

Disabled modules in `school.config.json` produce zero output — no pages, no nav items, no dead links.

### Navigation Auto-Generation

Based on enabled modules, the nav assembles dynamically. Schools never edit navigation manually.

Minimal deployment: `Home · News · Contact`
Full PTA deployment: `Home · Events · Volunteer · Donate · PTA · Community · News · About`

### Module List

- **pta** — Board directory, membership, meeting schedule, bylaws, newsletters
- **events** — Listings, iCal export, RSVP, recurring, categories, featured
- **volunteer** — Open roles, shift signup, volunteer hour tracking
- **fundraising** — Annual fund progress, campaigns, donation processing, donor wall
- **news** — Markdown posts, tags, categories, newsletter signup
- **lunch** — Weekly menu, allergies, free/reduced lunch
- **transportation** — Bus routes, schedules, carpool board
- **community** — Classifieds, carpool, skill share, new family guide, business directory
- **classroom** — Teacher pages, wishlists, reading lists
- **district** — Multi-school aggregation
- **resources** — Food, healthcare, housing, legal, mental health (localized)
- **transparency** — Public budget, fund allocation, year-over-year, meeting decisions

---

## Internationalization (i18n)

### Supported Languages (v1) — 20 Languages

| Code    | Language            | Primary US Communities         |
| ------- | ------------------- | ------------------------------ |
| en      | English             | Source of truth                |
| es      | Spanish             | ~75% of all US ELL students    |
| zh-hans | Chinese Simplified  | CA, NY, TX                     |
| zh-hant | Chinese Traditional | Taiwan diaspora                |
| ar      | Arabic              | Fastest growing ELL population |
| vi      | Vietnamese          | TX, CA, LA                     |
| ht      | Haitian Creole      | FL, NY, MA                     |
| so      | Somali              | MN, OH, ME                     |
| ru      | Russian             | NY, CA, WA                     |
| tl      | Tagalog             | CA, HI, NV                     |
| hmn     | Hmong               | MN, CA, WI                     |
| pt      | Portuguese          | MA, NJ, CA                     |
| ko      | Korean              | CA, NY, NJ                     |
| hi      | Hindi               | NJ, TX, CA                     |
| fr      | French              | General international          |
| am      | Amharic             | East African diaspora          |
| km      | Khmer               | CA, MA, MN                     |
| ur      | Urdu                | NY, TX, NJ                     |
| pa      | Punjabi             | CA                             |
| sw      | Swahili             | East African diaspora          |

### Translation Model

- `en.json` is the source of truth — all keys defined here
- Other locales are community-contributed via pull requests
- Missing keys fall back silently to English — never break the site
- School name, tagline, mascot are not translated (proper nouns)
- Language switcher in header whenever more than one language enabled
- Browser/device language auto-detected on first visit
- RTL architecture ready (for Arabic, Urdu) — do not hard-code LTR assumptions

### i18n Rules for All Code

- Never hardcode English strings in any component
- Always use the `t()` utility from `packages/i18n`
- Date and number formatting must respect locale
- Each module must declare its required keys in `i18n-keys.ts`

---

## Design Tokens

Single source in `packages/tokens/tokens.json`.
Style Dictionary generates platform outputs at build time:

- `packages/tokens/dist/web.css` — CSS custom properties for Astro
- `packages/tokens/dist/native.ts` — RN theme object for NativeWind

School `primaryColor` and `accentColor` from `school.config.json` are injected as CSS custom properties at runtime, overriding the defaults. Never hardcode colors in components.

---

## Mobile App Specification

### Core Concept

One app. Location-aware. Role-aware. Every school on one platform.

Modeled on Epic's MyChart — same app, personalized to your school and role. The app surface reflects exactly which modules the school has enabled.

### Tab Structure (adapts to enabled modules)

```
[ Home ] [ Events ] [ Volunteer ] [ Community ] [ More ]
```

### Privacy

- No advertising, ever — in the architecture, not just the policy
- No data sold, ever
- No photos of children without explicit per-post opt-in
- COPPA compliant
- FERPA aware
- Open source — anyone can audit the code
- PostHog analytics self-hostable — schools own their own data

---

## Content Collections Schema

See `apps/web/src/content/config.ts` for the canonical Zod schemas covering:

- `events` — title, date, location, category, registration, featured, cancelled
- `news` — title, publishDate, author, summary, tags, featured, image
- `board` — name, role, email, photo, bio, term dates, order
- `volunteers` — title, description, commitment, contact, filled, order
- `resources` — name, category, description, address, phone, url, languages

---

## Demo Implementation: SF Schools

The default branch ships with realistic demo content as a living proof of concept.

**Demo school:** Longfellow Elementary PTA, San Francisco, CA
**District:** San Francisco Unified School District

**Demo content:**

- 6 upcoming events: Fall Carnival, Walk-a-Thon, Movie Night, Book Fair, Science Night, 5th Grade Graduation
- 4 news posts: Welcome Back, Volunteer Call-Out, Fundraiser Update, Board Election Results
- 6 board members
- Annual fundraising goal: $45,000 with realistic in-progress amount
- 5 SF-specific resource entries
- Languages enabled: en, es, zh-hans, ru, tl

**Demo images:** Royalty-free school-appropriate images only — no real children's photos. All images must have meaningful alt text.

---

## Code Quality Standards

- All components accessible: ARIA labels, semantic HTML, keyboard nav
- Lighthouse targets: 95+ performance, 100 accessibility, 100 best practices
- Mobile-first: design for 375px width first
- No inline styles — Tailwind + design tokens only
- No hardcoded colors ever
- Images: meaningful alt text always
- TypeScript strict mode everywhere
- Prettier enforced via pre-commit hook
- No console.log in production
- Forms work without JavaScript (progressive enhancement)

---

## Accessibility Standards

- WCAG 2.1 AA minimum, AAA where achievable
- All interactive elements keyboard navigable
- Color contrast 4.5:1 minimum for body text
- Focus indicators visible and clearly styled
- Skip-to-main-content link on every page
- Screen reader tested: VoiceOver + NVDA
- Respect prefers-reduced-motion
- Form errors announced to screen readers
- lang attribute set correctly on all i18n pages

---

## What NOT to Build in v1

Document these in ROADMAP.md. Do not build in v1:

- Real-time chat or messaging
- Full web user account system (app auth only in v1)
- Built-in payment processing (link out only)
- Video hosting
- Photo gallery with upload
- School performance / test score data
- Gradebook or SIS integration
- Full district admin dashboard
- App Store submission (Expo Go only in v1)
- AI-powered features
- Advertising or sponsorship systems

---

## Guiding Principles

1. **Non-technical users first.** Can a PTA parent with no coding experience maintain this?
2. **Simple over clever.** Boring readable code over elegant abstractions.
3. **Config over code.** Everything a school changes lives in `school.config.json` or markdown.
4. **Performance for everyone.** Rural users on slow mobile are primary users — ship lean.
5. **Inclusive by default.** Multilingual, accessible, small-screen-ready from day one.
6. **Modules are independent.** Enabling or disabling a module never breaks anything else.
7. **Privacy by design.** No tracking, no ads, no data harvesting — in the architecture, not just policy.
8. **Community maintained.** Code must be approachable enough for volunteer contributors.

---

## License & Attribution

MIT License.

The only requirement for use — footer on every Schoolyard site and app About screen:

> Built with [Schoolyard](https://github.com/schoolyard-org/schoolyard) — open source for every school.
