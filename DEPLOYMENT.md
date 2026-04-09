# DEPLOYMENT.md — How to Get Your School's Site Online

> This guide is for school PTA volunteers and administrators with no coding background. If you can edit a Google Doc, you can deploy Schoolyard.

There are three deployment options. **We recommend Netlify** — it's free, the easiest, and handles forms, the CMS, and SSL automatically.

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
