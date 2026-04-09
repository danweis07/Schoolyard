# Community Module (stub)

The parent-to-parent layer — Schoolyard's key differentiator. To implement:

1. Build pages under `apps/web/src/pages/community/`:
   - `index.astro` — overview hub
   - `classifieds.astro` — uniforms, supplies, instruments, books
   - `carpool.astro` — carpool matching board
   - `skills.astro` — skill share registry
   - `welcome.astro` — new family welcome guide
2. Add `classifieds`, `carpool`, and `skills` content collections in `apps/web/src/content/config.ts`
3. Set `implemented: true` in `index.ts`
4. Add community-specific i18n keys to `packages/i18n/locales/en.json`
5. Test by enabling the module in `school.config.json`
