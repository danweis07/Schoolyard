# BACKEND.md — Schoolyard Backend Reference

> This file is the reference for operators and AI agents working on Schoolyard's Supabase backend. Read `CLAUDE.md` first for platform-wide context and `AI.md` for agent conventions. For setup, see `DEPLOYMENT.md`.

## Tenancy model

Schoolyard runs on **one shared Supabase project** with row-level security isolating schools. The tenant hierarchy is:

```
districts
   └── schools             ← RLS anchor. Every row in every other table references schools.id.
         └── content tables (events, news, board_members, …)
         └── dynamic state (event_rsvps, fundraising_donations, …)
```

`district_id` is optional — single-school deploys leave it null. When set, `district_admin` users can read aggregated data across all schools in their district, but cannot write to another district's schools.

A single Schoolyard deployment can therefore power:

- one school (null `district_id`)
- a district with many schools (shared `district_id`)
- many independent schools + many districts in the same Supabase project

## Roles

| Role             | Scope                              | Can read                               | Can write                                   |
| ---------------- | ---------------------------------- | -------------------------------------- | ------------------------------------------- |
| `anon`           | —                                  | published content, unhidden listings   | contact_submissions insert (honeypot gated) |
| `member`         | Authenticated user, no school role | Same as anon + own RSVPs, hours, flags | Own RSVPs, hours, flags, community listings |
| `editor`         | One school                         | All content in that school             | All content in that school                  |
| `admin`          | One school                         | Editor + dynamic state + submissions   | Same as editor + moderation + announcements |
| `district_admin` | One district                       | Admin for every school in the district | Admin for every school in the district      |

Roles are stored in `profiles.role` (free-text but check-constrained). `profiles.school_id` + `profiles.district_id` scope the role.

A JWT claim hook (installed in Phase 6) also promotes `role`, `school_id`, and `district_id` into `app_metadata` for faster RLS checks. Until the hook is active, RLS functions join on `profiles` by `auth.uid()`.

## Schema reference

### Tenant tables

**`districts`** — one row per district.
Key fields: `id`, `slug`, `name`, `settings jsonb`.
RLS: public read; only `district_admin` can update.

**`schools`** — one row per school. RLS anchor.
Key fields: `id`, `district_id`, `slug`, `name`, `short_name`, `domain`, `path_slug`, `branding jsonb`, `languages jsonb`, `modules jsonb`, `backend` ('static' | 'supabase').
RLS: public read; only `district_admin` of the same district can update.
Indexes: `schools_domain_idx`, `schools_path_slug_idx`, `schools_district_id_idx`.

### Content tables (one table per Astro content collection)

All content tables share this shape:

- `id uuid` primary key
- `school_id uuid` → `schools(id) on delete cascade`
- `slug text` — unique per `(school_id, slug)`
- `body_md text` + `body_html text` — source + pre-rendered
- `created_at` / `updated_at` with touch trigger

Table-specific columns:

| Table                   | Distinguishing fields                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `events`                | `starts_at`, `ends_at`, `location`, `category`, `capacity`, `rsvp_enabled`, `published`, `featured`, `cancelled`              |
| `news`                  | `excerpt`, `author`, `tags[]`, `image`, `image_alt`, `published_at`, `featured`, `published`                                  |
| `board_members`         | `name`, `role`, `email`, `photo_url`, `term_start`, `term_end`, `sort_order`                                                  |
| `volunteer_roles`       | `title`, `commitment`, `capacity`, `filled`, `contact_email`, `sort_order`                                                    |
| `resources`             | `name`, `category`, `address`, `phone`, `url`, `languages[]`                                                                  |
| `lunch_menus`           | `week_of`, `week_end`, `meals jsonb`, `allergens[]`, `free_reduced_note`, `pdf_url`                                           |
| `transportation_routes` | `route_number`, `route_name`, `driver`, `morning_arrival`, `afternoon_departure`, `stops jsonb`                               |
| `community_listings`    | `title`, `category`, `contact`, `neighborhood`, `posted_date`, `expires_date`, `url`, `created_by`, `flagged_count`, `hidden` |
| `classroom_teachers`    | `name`, `grade`, `subject`, `email`, `photo_url`, `wishlist jsonb`, `reading_list jsonb`                                      |
| `budget_years`          | `year`, `total_raised`, `total_spent`, `categories jsonb`, `summary`                                                          |
| `committees`            | `name`, `icon`, `description_md`, `meets`, `members jsonb`                                                                    |
| `programs`              | `name`, `grades`, `schedule`, `funding`, `partner`, `goal_cents`, `raised_cents`                                              |
| `pta_newsletters`       | `title`, `pdf_url`, `published_at`                                                                                            |

### Dynamic state tables

**`profiles`** — 1:1 with `auth.users`. Auto-created by `handle_new_user()` trigger.
Key fields: `id` (= `auth.users.id`), `display_name`, `school_id`, `district_id`, `role`.

**`event_rsvps`** — one row per (event, user). `status in ('going','maybe','canceled')`.

**`fundraising_donations`** — insert-only. RLS blocks all SELECTs except for `admin`. Public totals come from the `fundraising_program_totals` view.

**`contact_submissions`** — `honeypot` column rejects any non-null non-empty value via a `check` constraint. Anon can insert; only `admin` can read.

**`volunteer_hours`** — user-scoped CRUD, admin read. `hours` is numeric(5,2) > 0.

**`community_flags`** — authed insert, admin read/resolve. Once `flagged_count >= 3`, `increment_listing_flag()` auto-hides the listing.

**`push_tokens`** — one row per Expo push token. User-scoped writes, admin read.

**`announcements`** — admin writes, public read once `sent_at` is non-null.

### Views

**`fundraising_program_totals`** — `SELECT program_id, school_id, sum(amount_cents) AS raised_cents FROM fundraising_donations GROUP BY program_id, school_id`. Granted to `anon` + `authenticated`. The only public window into donations.

### Functions

| Function                            | Language | Purpose                                                                    |
| ----------------------------------- | -------- | -------------------------------------------------------------------------- |
| `is_school_editor(target_school)`   | sql      | RLS helper. True if current user is editor/admin/district_admin of school. |
| `is_school_admin(target_school)`    | sql      | RLS helper. True if current user is admin/district_admin of school.        |
| `current_school_id()`               | sql      | Shortcut for `profiles.school_id` where `id = auth.uid()`.                 |
| `increment_listing_flag(p_listing)` | plpgsql  | Bumps `flagged_count`; auto-hides at ≥3. `security definer`.               |
| `event_capacity_remaining(p_event)` | sql      | Computes open seats from `events.capacity` minus confirmed RSVPs.          |
| `handle_new_user()`                 | plpgsql  | Trigger on `auth.users` insert. Creates a `profiles` row.                  |
| `tg_update_program_raised()`        | plpgsql  | Trigger on `fundraising_donations` insert. Bumps `programs.raised_cents`.  |
| `tg_touch_updated_at()`             | plpgsql  | Generic trigger to keep `updated_at` fresh on content rows.                |

## RLS cheat sheet

The guiding rule: **every policy either matches `auth.uid()` or goes through `is_school_editor`/`is_school_admin`.** Never write a policy that compares a column to a literal.

```sql
-- public read on published content
create policy "public read events" on public.events
  for select using (published = true);

-- editor/admin writes scoped to the same school
create policy "editor write events" on public.events
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

-- user-scoped self-management
create policy "self write rsvps" on public.event_rsvps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- anon insert with guard
create policy "anon insert contact_submissions" on public.contact_submissions
  for insert with check (honeypot is null or honeypot = '');
```

## Admin workflows

### Promote a user to editor

```sql
update public.profiles
   set role = 'editor', school_id = '<school-uuid>'
 where id = '<user-uuid>';
```

Only `admin` or `district_admin` of the target school can do this (RLS enforces).

### Moderate a community listing

A listing flagged 3+ times auto-hides. To manually hide or unhide:

```sql
update public.community_listings
   set hidden = true
 where id = '<listing-uuid>';
```

To resolve a flag:

```sql
update public.community_flags
   set resolved = true
 where id = '<flag-uuid>';
```

### Export volunteer hours to CSV

Call the `volunteer-hours-export` edge function — returns a signed URL for a CSV scoped to `school_id` and date range. Admin-only.

### Push an announcement

Call the `announce` edge function with `{ school_id, title, body }`. Inserts an `announcements` row and dispatches via Expo Push API to every `push_tokens` row for that school.

## Edge function index

| Function                 | Path                                         | Purpose                                                                 |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------- |
| `contact-submit`         | `supabase/functions/contact-submit/`         | Validates honeypot + rate-limits by `ip_hash`, inserts row, sends email |
| `donate`                 | `supabase/functions/donate/`                 | Creates Stripe PaymentIntent using per-school secret                    |
| `stripe-webhook`         | `supabase/functions/stripe-webhook/`         | Handles Stripe events; inserts `fundraising_donations` on success       |
| `volunteer-hours-export` | `supabase/functions/volunteer-hours-export/` | Generates a signed CSV URL for admins                                   |
| `announce`               | `supabase/functions/announce/`               | Creates announcement + dispatches push tokens via Expo Push API         |

Deploy with `supabase functions deploy <name>`. Set secrets with `supabase secrets set KEY=value`.

## Incident runbook

### "Cross-tenant data leak" alarm

1. Run the RLS matrix test: `pnpm test:rls`. Note which test failed.
2. Flip `SCHOOLYARD_READONLY=true` on the web app to stop writes.
3. Inspect the offending policy: `supabase inspect db advisors`.
4. Fix the policy in a new migration (never edit an existing migration file).
5. Apply via `supabase db push` or MCP `apply_migration`.
6. Re-run `pnpm test:rls` until green.
7. Audit the affected rows by `school_id` — look for anything created during the window.
8. Remove the readonly flag.

### Supabase down

1. Confirm via [status.supabase.com](https://status.supabase.com).
2. Web is still partially served from prerendered static pages — hybrid mode degrades gracefully.
3. Mobile shows cached data via React Query + SQLite persister.
4. When Supabase recovers, push notifications queue will drain automatically (Expo retries).

### Runaway donation traffic

1. Check `fundraising_donations` insert rate in Supabase dashboard.
2. If Stripe is flagging, disable the `donate` edge function: `supabase functions disable donate`.
3. Fundraising page still shows the (stale) view total; donations stop writing.
4. Investigate, fix, re-enable.

## Backups

Nightly `pg_dump` to S3 ships with Phase 6. Retention is 7 days by default — increase for districts under audit. Restore via `supabase db restore`.

## References

- [Supabase RLS docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge function docs](https://supabase.com/docs/guides/functions)
- [PostgREST query syntax](https://postgrest.org/en/stable/references/api/tables_views.html)
- `supabase/migrations/*.sql` — the canonical DDL
- `packages/supabase/src/database.types.ts` — the canonical types
