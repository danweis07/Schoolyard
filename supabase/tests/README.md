# RLS policy tests

These tests verify row-level security across tenant isolation, role
escalation, and public vs. authed read paths. They are **release-blocking** —
any PR that touches `supabase/migrations/` must keep this suite green.

Each test impersonates one of six JWT profiles:

| Profile          | school | role           | purpose                      |
| ---------------- | ------ | -------------- | ---------------------------- |
| `anon`           | —      | anon           | public read paths            |
| `member-a`       | A      | member         | signed-in public reader      |
| `editor-a`       | A      | editor         | school-scoped content editor |
| `editor-b`       | B      | editor         | cross-tenant isolation probe |
| `admin-a`        | A      | admin          | moderation + dynamic state   |
| `district-admin` | A + B  | district_admin | multi-school aggregation     |

For every content table (`events`, `news`, ...) and every dynamic table
(`event_rsvps`, `fundraising_donations`, ...) the matrix asserts the
allow/deny behavior of `select`, `insert`, `update`, and `delete`.

Run locally:

```sh
supabase start
pnpm test:rls
```
