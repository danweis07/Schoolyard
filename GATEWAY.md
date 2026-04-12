# Gateway Architecture Refactoring Assessment

## Context

Schoolyard currently has three data-access paths, all of which expose the Supabase anon key and allow direct database queries from untrusted clients:

1. **Public content reads** — The `@schoolyard/content-api` supabase adapter (`packages/content-api/src/adapters/supabase.ts`) queries 14 content tables directly from both the Astro web server and React Native mobile app.
2. **Admin CRUD** — 10 admin `.astro` pages embed `data-supabase-url` + `data-supabase-anon` in HTML, create a `createBrowserClient()`, and perform INSERT/UPDATE/DELETE directly from the browser.
3. **Write operations** — 5 edge functions (`contact-submit`, `donate`, `announce`, `stripe-webhook`, `volunteer-hours-export`) each create their own service-role client and independently duplicate CORS, auth, and school-resolution logic.

The goal is a **single gateway edge function** that all frontends route through. Auth is handled at the gateway level. Public vs protected access is determined by the data's nature — public content passes through unauthenticated, while PII and confidential data require auth.

---

## Architecture Decisions

1. **Single gateway function** — One `supabase/functions/gateway/index.ts` handles CORS, auth, and routing. Domain handlers are internal modules, not separate edge functions. No extra network hops.
2. **Auth at the gateway** — The gateway inspects the route and decides whether auth is required based on the data classification (public vs confidential). Authenticated routes verify the Bearer token and resolve the user's role before dispatching.
3. **Public reads need no auth** — Content that is inherently public (published events, news, board, etc.) passes through without a token. Data containing PII or confidential information (profiles, contact submissions, donations, volunteer hours, email addresses) requires auth.
4. **Data classification drives access** — The schema itself determines what is public vs protected. Not all fields on a "public" table are public — the gateway controls which columns are returned.

---

## Data Classification by Schema

### Public (no auth required) — safe for anonymous reads

These tables contain school-published content with no PII. The gateway returns them freely, applying only `published`/`hidden` filters.

| Table | Public columns | Excluded from public response |
|-------|---------------|-------------------------------|
| `events` | slug, title, description, body_html, starts_at, ends_at, location, category, featured, cancelled | — (no PII) |
| `news` | slug, title, excerpt, body_html, author, tags, image, image_alt, published_at, featured | — |
| `board_members` | slug, name, role, photo_url, bio_html, term_start, term_end, sort_order | `email` (PII — only via admin) |
| `volunteer_roles` | slug, title, description_html, commitment, capacity, filled, sort_order | `contact_email` (PII — only via admin) |
| `resources` | slug, name, category, description, address, phone, url, languages | — (org contact info, not personal) |
| `lunch_menus` | all columns | — |
| `transportation_routes` | slug, route_number, route_name, morning_arrival, afternoon_departure, stops, notes, sort_order | `driver` (PII — staff name, admin only) |
| `community_listings` (hidden=false) | slug, title, category, description, neighborhood, posted_date, expires_date, url, sort_order | `contact` (PII), `created_by` (user ID), `flagged_count` (moderation) |
| `classroom_teachers` | slug, name, grade, subject, photo_url, bio_md, wishlist, reading_list, sort_order | `email` (PII — only via admin) |
| `budget_years` | all columns | — |
| `committees` | all columns | — |
| `programs` | all columns | — |
| `pta_newsletters` | all columns | — |
| `announcements` (sent_at not null) | title, body, sent_at | `created_by` (user ID) |
| `schools` | slug, name, short_name, branding, languages, modules | `domain`, `path_slug` (infra) |
| `districts` | slug, name | `settings` (internal config) |
| `fundraising_program_totals` (view) | program_id, school_id, raised_cents | — (aggregate only, no donor info) |

### Auth required — contains PII or confidential data

| Table | Auth level | Reason |
|-------|-----------|--------|
| `profiles` | Self (own) or Admin (school) | User PII: display_name, email (via auth), role, school_id |
| `event_rsvps` | Self (own) or Admin (school) | User action data: who is attending, guest counts |
| `volunteer_hours` | Self (own) or Admin (school) | User PII: who volunteered, when, how long |
| `contact_submissions` | Admin only | PII: name, email, message content, IP hash |
| `fundraising_donations` | Admin only | PII: donor_name, donor_email, payment amounts |
| `community_flags` | Admin only | Moderation data: reporter identity, reasons |
| `push_tokens` | Self (own) or Admin (school) | Device identifiers tied to user accounts |
| Board member `email` | Admin only | Personal email, not for public display |
| Volunteer role `contact_email` | Admin only | Staff/volunteer personal contact |
| Teacher `email` | Admin only | Staff personal contact |
| Transportation `driver` | Admin only | Staff name |
| Community listing `contact` | Authenticated | Poster's contact info (visible to logged-in community members) |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE GATEWAY EDGE FUNCTION                  │
│                  supabase/functions/gateway/index.ts              │
├─────────────────────────────────────────────────────────────────┤
│  1. CORS handling                                                │
│  2. Route parsing: /gateway/v1/<domain>/<resource>[/<id>]        │
│  3. Auth decision: is this route public or protected?            │
│     ├── Public route → skip auth, dispatch to handler            │
│     └── Protected route → verify Bearer token, resolve role      │
│  4. Dispatch to domain handler module                            │
│  5. Return JSON response                                         │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN HANDLERS (internal modules, not separate functions)      │
│                                                                  │
│  content/   — public reads (14 collections, column-filtered)     │
│  admin/     — authenticated CRUD (editor/admin role required)    │
│  user/      — user-scoped actions (RSVP, hours, tokens, flags)   │
│  fundraising/ — donate (public) + stripe webhook (sig-verified)  │
│  contact/   — contact form submission (public, rate-limited)     │
│  announce/  — push notifications (admin-only)                    │
│  export/    — CSV exports (admin-only)                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Supabase (service key)  │
│  Postgres + RLS          │
│  (defense-in-depth)      │
└─────────────────────────┘
```

All frontends (web, mobile, admin) call:
```
POST/GET  <supabase-url>/functions/v1/gateway/<domain>/<resource>
```

---

## Gateway File Structure

```
supabase/functions/gateway/
├── index.ts                        # Entry point: CORS → route → auth → dispatch
├── router.ts                       # URL parser + route table
├── auth.ts                         # Token verification + role resolution
├── school.ts                       # Slug→UUID with in-memory cache
├── response.ts                     # jsonOk(), jsonError(), csv()
├── types.ts                        # Shared request/response types
│
├── handlers/
│   ├── content.ts                  # Public reads — column-filtered per table
│   ├── admin.ts                    # CRUD — role-gated, returns full rows
│   ├── user.ts                     # RSVP, volunteer hours, push tokens, flags
│   ├── fundraising.ts              # Donate (public) + Stripe webhook
│   ├── contact.ts                  # Contact form (public, rate-limited)
│   ├── announce.ts                 # Push notifications (admin-only)
│   └── export.ts                   # CSV exports (admin-only)
│
└── column-filters.ts               # Per-table public column allowlists
```

### Route Table & Auth Requirements

```
ROUTE                                METHOD    AUTH         HANDLER
─────────────────────────────────────────────────────────────────────
/content/manifest                    GET       none         content
/content/config                      GET       none         content
/content/events                      GET       none         content
/content/news                        GET       none         content
/content/board                       GET       none         content
/content/volunteers                  GET       none         content
/content/resources                   GET       none         content
/content/lunch-menus                 GET       none         content
/content/transportation              GET       none         content
/content/community                   GET       none         content
/content/teachers                    GET       none         content
/content/budget                      GET       none         content
/content/committees                  GET       none         content
/content/programs                    GET       none         content
/content/newsletters                 GET       none         content
/content/announcements               GET       none         content
/content/counts                      GET       none         content

/admin/profile                       GET       auth(any)    admin
/admin/counts                        GET       auth(editor) admin
/admin/{table}                       GET       auth(editor) admin
/admin/{table}/:id                   GET       auth(editor) admin
/admin/{table}                       POST      auth(editor) admin
/admin/{table}/:id                   PUT       auth(editor) admin
/admin/{table}/:id                   DELETE    auth(editor) admin

/user/rsvp                           POST      auth(member) user
/user/rsvps                          GET       auth(member) user
/user/rsvp/:id                       DELETE    auth(member) user
/user/volunteer-hours                POST      auth(member) user
/user/volunteer-hours                GET       auth(member) user
/user/push-token                     POST      auth(member) user
/user/flag-listing                   POST      auth(member) user
/user/community-listing              POST      auth(member) user

/fundraising/donate                  POST      none         fundraising
/fundraising/webhook                 POST      stripe-sig   fundraising

/contact/submit                      POST      none         contact

/announce                            POST      auth(admin)  announce

/export/volunteer-hours              POST      auth(admin)  export
```

Auth levels:
- `none` — no token required, passes through
- `auth(member)` — any authenticated user
- `auth(editor)` — editor, admin, or district_admin for the target school
- `auth(admin)` — admin or district_admin for the target school
- `stripe-sig` — Stripe webhook signature verification (no Bearer token)

### Column Filtering (`column-filters.ts`)

The gateway uses per-table allowlists for public responses, stripping PII:

```typescript
export const PUBLIC_COLUMNS = {
  board_members: ['slug', 'name', 'role', 'photo_url', 'bio_html', 'term_start', 'term_end', 'sort_order'],
  // email excluded — PII

  volunteer_roles: ['slug', 'title', 'description_html', 'commitment', 'capacity', 'filled', 'sort_order'],
  // contact_email excluded — PII

  transportation_routes: ['slug', 'route_number', 'route_name', 'morning_arrival', 'afternoon_departure', 'stops', 'notes', 'sort_order'],
  // driver excluded — PII

  community_listings: ['slug', 'title', 'category', 'description', 'neighborhood', 'posted_date', 'expires_date', 'url', 'sort_order'],
  // contact excluded — PII (returned only to authenticated users)
  // created_by, flagged_count excluded — internal

  classroom_teachers: ['slug', 'name', 'grade', 'subject', 'photo_url', 'bio_md', 'wishlist', 'reading_list', 'sort_order'],
  // email excluded — PII

  announcements: ['title', 'body', 'sent_at'],
  // created_by excluded — internal
} as const
```

Admin responses return **all columns** since the user has been role-verified at the gateway.

---

## Content-API Changes

### New gateway adapter

**New file: `packages/content-api/src/adapters/gateway.ts`**

Implements the existing `ContentAdapter` interface via HTTP `fetch()`. Each method calls `GET <gatewayUrl>/functions/v1/gateway/content/<collection>?school=<slug>`.

```typescript
export interface GatewayAdapterOptions {
  gatewayUrl: string           // Supabase project URL
  defaultSchoolSlug?: string
}

export function createGatewayAdapter(options: GatewayAdapterOptions): ContentAdapter
```

The row-to-shape mapping that currently lives in `packages/content-api/src/adapters/supabase.ts` (lines 131-444) moves into `gateway/handlers/content.ts`. The gateway adapter becomes a thin HTTP client — it receives already-mapped shapes from the gateway.

### Client router update

**Modified: `packages/content-api/src/client.ts`**

```typescript
export type ContentBackend = 'static' | 'supabase' | 'gateway'

export interface ContentClientOptions {
  backend: ContentBackend
  baseUrl?: string                        // static mode
  supabase?: SupabaseClient<Database>     // supabase mode (scripts only)
  gatewayUrl?: string                     // gateway mode
  defaultSchoolSlug?: string
}
```

The `supabase` adapter stays for trusted server-side scripts (migrations, seeding). The `static` adapter stays for zero-backend deployments.

---

## Web App Changes

### Middleware (`apps/web/src/middleware.ts`)

Replace `Astro.locals.supabase` with `Astro.locals.contentClient`:

```typescript
locals.contentClient = createContentClient({
  backend: 'gateway',
  gatewayUrl: process.env.SUPABASE_URL,
  defaultSchoolSlug: school.slug,
})
```

### Admin pages (10 files)

**Current pattern**: browser creates `createBrowserClient()`, queries tables directly via `.from()`.

**New pattern**: 
- Supabase Auth client stays in browser for sign-in/sign-out/getSession ONLY
- Extract access token from session
- All data calls go through `fetch()` to `gateway/admin/*`
- New `apps/web/src/lib/admin-client.ts` wraps these calls

**Files to modify:**
- `apps/web/src/pages/admin/index.astro`
- `apps/web/src/pages/admin/events/index.astro`
- `apps/web/src/pages/admin/events/edit.astro`
- `apps/web/src/pages/admin/news/index.astro`
- `apps/web/src/pages/admin/news/edit.astro`
- `apps/web/src/pages/admin/board/index.astro`
- `apps/web/src/pages/admin/board/edit.astro`
- `apps/web/src/pages/admin/volunteers/index.astro`
- `apps/web/src/pages/admin/volunteers/edit.astro`
- `apps/web/src/pages/admin/resources/index.astro`

### Contact form (`apps/web/src/components/ContactForm.astro`)

Currently POSTs to `<supabaseUrl>/functions/v1/contact-submit`. Update to `<supabaseUrl>/functions/v1/gateway/contact/submit`.

---

## Mobile App Changes

### `apps/mobile/lib/manifest.ts`

Default to `'gateway'` backend. All hooks (`useEvents`, `useNews`, etc.) need **zero changes**.

### `apps/mobile/lib/supabase.ts`

Keep for auth-only. Document that `.from()` is prohibited.

### `apps/mobile/lib/notifications.ts`

Replace direct `push_tokens` upsert with `fetch()` to `gateway/user/push-token`.

---

## Existing Edge Functions — Migration Path

The 5 existing edge functions are **absorbed** into the single gateway:

| Current function | Becomes gateway handler | Notes |
|-----------------|------------------------|-------|
| `contact-submit/index.ts` | `handlers/contact.ts` | Honeypot + rate limiting preserved |
| `donate/index.ts` | `handlers/fundraising.ts` | Stripe PaymentIntent creation |
| `stripe-webhook/index.ts` | `handlers/fundraising.ts` | Signature verification preserved |
| `announce/index.ts` | `handlers/announce.ts` | Expo push fan-out preserved |
| `volunteer-hours-export/index.ts` | `handlers/export.ts` | CSV generation preserved |

After the gateway is deployed and all clients are switched, the old function directories can be removed.

---

## What Changes vs What Stays

### Unchanged (reused as-is)
- `packages/content-api/src/adapters/types.ts` — ContentAdapter interface
- `packages/content-api/src/types.ts` — all domain types
- `packages/content-api/src/adapters/static.ts` — static adapter
- `packages/content-api/src/events.ts`, `news.ts`, `board.ts` — helper utilities
- All mobile hooks and UI components
- All web page templates (only admin `<script>` blocks change)
- `supabase/migrations/*` — no schema changes
- RLS policies — kept as defense-in-depth
- `packages/config/*`, `packages/i18n/*`, `packages/tokens/*`, `packages/ui/*`

### Modified (minor changes)
- `packages/content-api/src/client.ts` — add `'gateway'` backend
- `packages/content-api/src/index.ts` — export gateway adapter
- `apps/web/src/middleware.ts` — swap supabase client for gateway adapter
- `apps/web/src/components/ContactForm.astro` — update endpoint URL
- `apps/mobile/lib/manifest.ts` — change default backend to gateway
- `apps/mobile/lib/supabase.ts` — document auth-only usage
- `apps/mobile/lib/notifications.ts` — use gateway for push token

### New code (~1,600 lines)
- `supabase/functions/gateway/index.ts` — entry point (~80 lines)
- `supabase/functions/gateway/router.ts` — route table + URL parser (~100 lines)
- `supabase/functions/gateway/auth.ts` — token verify + role resolve (~80 lines)
- `supabase/functions/gateway/school.ts` — slug→UUID cache (~50 lines)
- `supabase/functions/gateway/response.ts` — response helpers (~40 lines)
- `supabase/functions/gateway/types.ts` — shared types (~30 lines)
- `supabase/functions/gateway/column-filters.ts` — PII allowlists (~60 lines)
- `supabase/functions/gateway/handlers/content.ts` — public reads (~300 lines)
- `supabase/functions/gateway/handlers/admin.ts` — CRUD (~400 lines)
- `supabase/functions/gateway/handlers/user.ts` — user actions (~150 lines)
- `supabase/functions/gateway/handlers/fundraising.ts` — donate + webhook (~180 lines)
- `supabase/functions/gateway/handlers/contact.ts` — contact form (~80 lines)
- `supabase/functions/gateway/handlers/announce.ts` — push notifications (~70 lines)
- `supabase/functions/gateway/handlers/export.ts` — CSV exports (~80 lines)
- `packages/content-api/src/adapters/gateway.ts` — gateway adapter (~150 lines)
- `apps/web/src/lib/admin-client.ts` — admin API wrapper (~100 lines)

### Rewritten (significant changes)
- 10 admin `.astro` files — replace browser Supabase CRUD with gateway calls
- 5 existing edge functions — logic absorbed into gateway handlers, old dirs removed

---

## Implementation Phases

### Phase 1: Gateway foundation + public content reads
1. Create `supabase/functions/gateway/` with index.ts, router.ts, auth.ts, school.ts, response.ts, types.ts, column-filters.ts
2. Create `handlers/content.ts` — port mapping logic from `packages/content-api/src/adapters/supabase.ts`, apply column filters for PII
3. Create `packages/content-api/src/adapters/gateway.ts`
4. Add `'gateway'` backend to `packages/content-api/src/client.ts`
5. Deploy gateway, test with `EXPO_PUBLIC_SCHOOLYARD_BACKEND=gateway`

### Phase 2: Absorb existing write functions
6. Port `contact-submit` → `handlers/contact.ts`
7. Port `donate` + `stripe-webhook` → `handlers/fundraising.ts`
8. Port `announce` → `handlers/announce.ts`
9. Port `volunteer-hours-export` → `handlers/export.ts`
10. Deploy, verify all write flows work through gateway

### Phase 3: Admin gateway + page refactoring
11. Create `handlers/admin.ts` with full CRUD for all content tables
12. Create `apps/web/src/lib/admin-client.ts`
13. Convert admin pages one by one (events first, then news, board, volunteers, resources)

### Phase 4: User actions
14. Create `handlers/user.ts` — RSVP, volunteer hours, push tokens, flags, community listings
15. Update mobile push token registration
16. Update community flag button

### Phase 5: Switch frontends to gateway
17. Update `apps/web/src/middleware.ts` — gateway adapter
18. Update `apps/web/src/components/ContactForm.astro` — new endpoint
19. Change mobile default backend to `gateway`
20. Verify all flows end-to-end

### Phase 6: Cleanup
21. Remove old edge function directories (`contact-submit/`, `donate/`, `stripe-webhook/`, `announce/`, `volunteer-hours-export/`)
22. Remove `data-supabase-anon` from admin page HTML
23. Add lint rule to prevent `.from()` on browser Supabase client
24. Update BACKEND.md, DEPLOYMENT.md, .env.example
25. Mark supabase adapter as `@internal` (keep for migration scripts)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Single function = single point of failure** | Supabase Edge Functions auto-scale on Deno Deploy. The function is stateless. Monitoring via Supabase logs. |
| **Function size** | All handlers are imported but only the matched route executes. Deno tree-shakes unused code paths at runtime. |
| **Added latency** (browser→gateway→DB vs browser→DB) | Gateway and DB are co-located in same Supabase region. Add `Cache-Control` headers to public content responses. |
| **Auth token expiration** in admin pages | Admin client listens for `onAuthStateChange`, retries on 401 with refreshed token. |
| **PII leaking through public endpoints** | Column-filter allowlists are the enforced contract. Integration tests verify no PII columns appear in public responses. |
| **Backward compat during migration** | `ContentBackend` union allows per-deployment switching via env var. Old edge functions stay deployed until Phase 6. |

---

## Verification Plan

1. **PII audit test**: Automated test that calls every `/content/*` endpoint and asserts response objects contain ONLY allowlisted columns — fails if `email`, `contact_email`, `driver`, `contact`, `created_by`, `ip_hash`, `donor_email`, `donor_name` appear
2. **Content parity test**: Call both the `supabase` adapter and the `gateway` adapter for the same school, assert identical shapes (minus PII-filtered columns)
3. **Auth matrix test**: For each protected route, verify: anonymous → 401, wrong role → 403, correct role → 200
4. **Admin CRUD smoke test**: Create/edit/delete an event through the admin gateway
5. **RLS regression**: Existing `supabase/tests/rls.spec.ts` continues to pass (defense-in-depth)
6. **Mobile integration**: All React Query hooks return correct data with `gateway` backend
7. **Existing function regression**: Contact form, donations, announcements, volunteer export all work through gateway before old functions are removed
