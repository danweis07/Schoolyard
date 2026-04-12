# Spirit Store Examples

The spirit store module uses a database-backed product catalog rather than
Markdown content files. Products are managed by editors via the admin UI
or direct Supabase inserts.

## Demo Seed Data

When running `pnpm run migrate:supabase`, the following demo products are
seeded for the Longfellow Elementary demo school:

- Eagle T-Shirt ($15) — Sizes: S, M, L, XL
- Eagle Hoodie ($35) — Sizes: S, M, L, XL
- Eagle Car Magnet ($8) — No variants
- Spirit Week Bundle ($45) — Sizes: S, M, L, XL

## Configuration

The store's open/close window and payment provider are configured in
`school.config.json` under the `spiritStore` key.
