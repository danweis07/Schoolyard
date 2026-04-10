# FSK Schoolyard — Josh's Deployment

This folder contains everything needed to run the Schoolyard platform as the **Francis Scott Key Elementary PTA** site.

## What's included

```
josh/
├── school.config.fsk.json          # FSK school configuration
├── setup.sh                        # One-command setup script
├── README.md                       # You are here
└── content/
    ├── board/                      # 7 PTA board members
    ├── events/                     # 7 school events (Fall Festival → Passport Day)
    ├── news/                       # 4 news posts
    ├── volunteers/                 # 5 volunteer opportunities
    └── resources/                  # 5 Sunset District community resources
```

## Quick start

```bash
# From the repo root
cd josh
bash setup.sh

# Back to root to run the site
cd ..
pnpm install
pnpm dev
```

The setup script replaces the default Longfellow demo content with FSK content and updates `school.config.json`.

## What's different from the default demo

| Feature | Longfellow (default) | FSK (this folder) |
|---------|---------------------|-------------------|
| Enrollment | 320 students | 562 students |
| Languages | en, es, zh-hans, ru, tl | en, es, zh-hans, zh-hant, ru, tl |
| Fundraising goal | $45,000 | $100,000 |
| Board members | 6 | 7 (includes Enrichment Chair) |
| Events | 6 generic | 7 FSK-specific (Gala, Lunar New Year, Passport Day) |
| Modules enabled | 5 | 8 (adds lunch, community, resources, transparency) |
| Social media | None | Instagram + Facebook |
| Resources | Generic SF | Sunset District specific |

## Enhanced PTA features

This branch also adds three new PTA sub-pages to the platform:

- **/pta/committees** — PTA committees with descriptions and how to join
- **/pta/newsletters** — Newsletter archive with links
- **/pta/enrichment** — Enrichment programs funded by the PTA (STEAM, garden, after-school)

These pages are available to all schools using Schoolyard, not just FSK.

## Customizing

1. **School config** — Edit `school.config.json` (or `josh/school.config.fsk.json` before running setup)
2. **Board members** — Edit markdown files in `apps/web/src/content/board/`
3. **Events** — Add/edit markdown files in `apps/web/src/content/events/`
4. **News** — Add/edit markdown files in `apps/web/src/content/news/`
5. **Branding** — Change `primaryColor` and `accentColor` in the config. FSK uses red (#b22234) and navy (#3c3b6e)

## Deploying

```bash
pnpm build          # Build the static site
# Deploy the dist/ folder to Vercel, Netlify, or any static host
```
