# Lunch Module (stub)

This is a stub. To implement:

1. Build pages under `apps/web/src/pages/lunch/`:
   - `index.astro` — weekly menu (read from a content collection)
   - `nutrition.astro` — allergens and nutrition info
   - `assistance.astro` — free / reduced lunch application info
2. Add a `lunch` content collection in `apps/web/src/content/config.ts` with fields for week-of, day, entree, sides, allergens
3. Set `implemented: true` in `index.ts`
4. Add lunch-specific i18n keys to `packages/i18n/locales/en.json`
5. Test by enabling the module in `school.config.json`

See `events/` or `news/` for reference patterns.
