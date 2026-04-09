# District Module (stub)

Aggregates multiple Schoolyard schools into one view. To implement:

1. Build pages under `apps/web/src/pages/district/`:
   - `index.astro` — district overview
   - `schools.astro` — directory of all schools
   - `events.astro` — district-wide event calendar
2. Pull data from a federated source (e.g., a JSON manifest each school publishes)
3. Set `implemented: true` in `index.ts`
4. Test by enabling the module in `school.config.json`
