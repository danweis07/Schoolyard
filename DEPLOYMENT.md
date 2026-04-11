# DEPLOYMENT.md — How to Get Your School's Site Online

> This guide covers two deployment paths:
>
> 1. **Supabase-backed (recommended)** — dynamic features, auth, live donations. Requires a technical maintainer (district IT, PTO volunteer who can run the CLI, state DoE team).
> 2. **Legacy static** — pure git + Netlify, zero backend, limited features. Good for very small deployments and contributors who want to try the project without standing up Postgres.

---

## Path 1: Supabase-backed deployment (recommended)

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free tier)
2. Create a new project — region close to your users, strong database password
3. Once it's up, grab three values from **Project Settings → API**:
   - **Project URL** — e.g. `https://abc123.supabase.co`
   - **anon / public key** — safe to expose in bundles
   - **service_role / secret key** — KEEP SECRET, only used by `scripts/migrate-to-supabase.ts` and edge functions

### 2. Apply the schema

Two options:

**Supabase CLI (preferred):**

```sh
npm install -g supabase
supabase login
supabase link --project-ref <your-ref>
supabase db push     # applies supabase/migrations/0001…0006.sql
```

**SQL editor (no CLI):** open each of the 6 files under `supabase/migrations/` in the Supabase Dashboard SQL editor, in numeric order, and run them.

After the schema is up, check security advisors:

```sh
supabase inspect db advisors
```

Any finding is release-blocking. Common ones: missing RLS on a new table, missing `with check` clause, functions without `security definer`.

### 3. Set env vars

Create `.env.local` at the repo root:

```sh
SCHOOLYARD_BACKEND=supabase
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role secret key>
```

For the Expo app, also add the `EXPO_PUBLIC_*` twins so Metro can see them at build time:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

### 4. Seed your content

If you're starting from the existing Markdown in `apps/web/src/content/`:

```sh
pnpm migrate:supabase --dry-run   # parse + report, no writes
pnpm migrate:supabase             # upsert to Postgres
```

The migrator is idempotent — re-running it upserts on `(school_id, slug)` and doesn't duplicate rows.

### 5. Deploy web (hybrid mode)

Hybrid mode means public pages are prerendered as static HTML while pages that need live data (donations, RSVPs, contact forms) render per request. This requires a **Node** deploy target, not a static one.

- **Vercel** — works out of the box; pick the Node adapter in project settings.
- **Netlify** — install `@astrojs/netlify`, set `output: 'hybrid'` in `astro.config.mjs` (already done), deploy.
- **Fly.io / Railway / your own box** — `pnpm --filter web build` then `node ./dist/server/entry.mjs`.

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SCHOOLYARD_BACKEND=supabase` in the host's env vars.

### 6. Deploy edge functions

```sh
supabase functions deploy contact-submit
supabase functions deploy donate
supabase functions deploy stripe-webhook
supabase functions deploy announce
supabase functions deploy volunteer-hours-export
```

Set their secrets (Stripe keys, Resend API key, etc.) via `supabase secrets set`.

### 7. Verify

- Visit `/contact`, submit the form with the honeypot filled → should reject. Leave honeypot empty → should accept.
- Sign in via magic link → RSVP an event → confirm row in `event_rsvps`.
- Donate via Stripe test card → check `fundraising_donations` grew, and the fundraising page total updates (via the `fundraising_program_totals` view).
- `supabase inspect db advisors` → still clean.

---

## Path 2: Legacy static deployment

Three deployment options. **We recommend Netlify** — it's free, the easiest, and handles forms, the CMS, and SSL automatically.

---

## Option A: Netlify (Recommended)

### One-Click Deploy

1. Click this button (replace with your fork's URL once you fork):

   [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/schoolyard-org/schoolyard)

2. Sign in to Netlify with your GitHub account
3. Pick a name for your site (you can change it later)
4. Click "Deploy"
5. Wait 60 seconds. Your site is live at `https://<your-name>.netlify.app`

### Connect Your School Domain

1. In Netlify, go to **Site settings → Domain management → Add custom domain**
2. Enter your domain (e.g., `longfellowsfpta.org`)
3. Netlify shows you DNS records to add at your domain registrar
4. SSL is automatic — Netlify provisions a free Let's Encrypt certificate

**Recommended registrars:** Cloudflare (cheapest), Namecheap, Google Domains. Avoid GoDaddy.

**Free .org domain options for schools:** Some non-profits qualify for free domains via TechSoup, Google for Nonprofits, or directly through their state PTA chapter.

### Enable the CMS Editor (Optional)

The `/admin` panel lets non-technical editors update content from a friendly UI without touching GitHub.

1. In Netlify, go to **Site settings → Identity → Enable Identity**
2. Set registration to **Invite only** (so only your PTA officers can edit)
3. Under **Identity → Services → Git Gateway → Enable Git Gateway**
4. Invite your editors via email
5. They'll receive an invitation, set a password, then go to `https://your-site.netlify.app/admin/`

### Enable Form Submissions

Schoolyard's contact and volunteer forms work without any setup on Netlify — they're automatically detected as Netlify Forms. View submissions in **Forms** tab of your Netlify dashboard.

---

## Option B: Vercel

1. Sign in to Vercel with your GitHub account
2. Click **Add New → Project**
3. Import your fork
4. Framework preset: **Astro**
5. Root directory: `apps/web`
6. Build command: `pnpm --filter web build`
7. Output directory: `dist`
8. Click **Deploy**

**Custom domain setup:** **Project Settings → Domains → Add**, then update DNS at your registrar. SSL is automatic.

**Forms on Vercel:** Vercel doesn't have a built-in forms backend. Use [Formspree](https://formspree.io) (free for under 50 submissions/month) — set the form `action` URL in `school.config.json`.

---

## Option C: GitHub Pages

GitHub Pages is free but has limitations: no form handling and no built-in CMS auth.

1. In your fork's settings, go to **Pages**
2. Set source to **GitHub Actions**
3. Schoolyard ships with a workflow at `.github/workflows/deploy-pages.yml` that builds and deploys on every push to `main`
4. Your site is live at `https://<username>.github.io/schoolyard/`

**Limitations:**

- Forms: use Formspree, since GitHub Pages can't process form submissions
- CMS: editors must commit changes via GitHub directly (not the friendly `/admin` panel)

---

## Mobile App Distribution

The Schoolyard mobile app is a runnable Expo skeleton in v1. Production-quality mobile is on the roadmap.

### Test in Expo Go (No App Store Required)

This is the recommended way to demo the app to your PTA before any official release.

1. Install **Expo Go** on your phone (App Store / Play Store)
2. From the repo root: `pnpm dev:mobile`
3. Scan the QR code with Expo Go (Android) or your camera (iOS)
4. The app loads instantly with your school's config

### Production Builds (Future)

Once you're ready to ship to families:

1. Sign up for **Expo Application Services (EAS)** — free tier covers most schools
2. Run `eas build --platform all`
3. Submit via TestFlight (iOS) and Internal Testing (Android) for beta
4. Submit to App Store and Play Store when ready

A district can publish a single Schoolyard app and have every school in the district appear inside it — see [CLAUDE.md](./CLAUDE.md) for the multi-school architecture.

---

## Troubleshooting

**Build fails with "school.config.json not found"** → Make sure `school.config.json` exists at the repo root. Copy from `school.config.example.json` if needed.

**Build fails with Zod validation errors** → Run `pnpm validate-config` locally to see exactly what's wrong. Common issues: missing required fields, invalid color hex codes, invalid enum values.

**Translations don't appear** → Make sure the locale code is in `school.config.json` `languages.supported` and the JSON file exists at `packages/i18n/locales/<code>.json`.

**Content doesn't update on the live site** → Netlify and Vercel auto-rebuild on every push to `main`. If it's not rebuilding, check the deploy log in your Netlify or Vercel dashboard.

**Need help?** Open an issue at [github.com/schoolyard-org/schoolyard/issues](https://github.com/schoolyard-org/schoolyard/issues). We try to respond within 48 hours.
