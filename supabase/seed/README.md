# Supabase seed data

This folder holds SQL fixtures used by:

- local development (`supabase start` → `supabase db reset` applies `seed.sql`)
- RLS integration tests in `supabase/tests/`
- CI — loaded before running `pnpm test:rls`

The seed file is generated automatically by `scripts/migrate-to-supabase.ts`
when run with `--output=supabase/seed/seed.sql` (offline dry-run mode).
Do not hand-edit the generated file; update the Markdown source under
`apps/web/src/content/` and regenerate.
