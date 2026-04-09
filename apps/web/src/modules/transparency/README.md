# Transparency Module (stub)

Public budget, fund allocation, year-over-year. To implement:

1. Build pages under `apps/web/src/pages/transparency/`:
   - `index.astro` — overview with current-year breakdown
   - `budget.astro` — line-item budget
   - `history.astro` — year-over-year comparison
2. Add a `budget` content collection in `apps/web/src/content/config.ts`
3. Set `implemented: true` in `index.ts`
4. Test by enabling the module in `school.config.json`
