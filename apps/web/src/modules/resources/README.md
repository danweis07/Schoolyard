# Resources Module (stub)

Built for underserved communities — food banks, healthcare, housing, legal, mental health resources. The `resources` content collection already exists and has 5 SF-specific demo entries in `apps/web/src/content/resources/`.

To finish:

1. Build pages under `apps/web/src/pages/resources/`:
   - `index.astro` — list grouped by category, multilingual
   - `[category].astro` — filtered by category
2. Set `implemented: true` in `index.ts`
3. Test by enabling the module in `school.config.json`

The content collection schema in `apps/web/src/content/config.ts` already supports localization-by-language.
