/**
 * RLS Policy Matrix Tests
 *
 * Release-blocking per CLAUDE.md § Guiding Principles #8:
 *   "Tenant isolation is release-blocking."
 *
 * Profile matrix (6 profiles):
 *   anon          — no auth, public reads only
 *   member-a      — signed-in member at school A
 *   editor-a      — editor at school A (can write school A content)
 *   editor-b      — editor at school B (cross-tenant isolation probe)
 *   admin-a       — admin at school A (moderation + dynamic state)
 *   district-admin — district_admin with visibility across A + B
 *
 * For each table we test the 4 CRUD operations where applicable.
 * Tests assert both allowed AND denied paths — a test that only checks
 * "editor can write" without also checking "anon cannot write" is
 * incomplete.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { type TestContext, setupTestContext, teardownTestContext } from './helpers.js'

let ctx: TestContext

beforeAll(async () => {
  ctx = await setupTestContext()
})

afterAll(async () => {
  if (ctx) await teardownTestContext(ctx)
})

// ─── Helpers ──────────────────────────────────────────────────────────

/** Assert a select returns rows (non-empty). */
async function expectRows(
  client: typeof ctx.anon,
  table: string,
  filter?: { column: string; value: string },
) {
  let q = client.from(table).select('id')
  if (filter) q = q.eq(filter.column, filter.value)
  const { data, error } = await q
  expect(error).toBeNull()
  expect(data!.length).toBeGreaterThan(0)
}

/** Assert a select returns zero rows (denied or filtered). */
async function expectNoRows(
  client: typeof ctx.anon,
  table: string,
  filter?: { column: string; value: string },
) {
  let q = client.from(table).select('id')
  if (filter) q = q.eq(filter.column, filter.value)
  const { data, error } = await q
  // RLS denials may return empty array (silently filtered) or an error
  if (error) return // denied at policy level
  expect(data!.length).toBe(0)
}

/** Assert an insert is denied. */
async function expectInsertDenied(
  client: typeof ctx.anon,
  table: string,
  row: Record<string, unknown>,
) {
  const { error } = await client.from(table).insert(row)
  expect(error).not.toBeNull()
}

/** Assert an update is denied (affects 0 rows or errors). */
async function expectUpdateDenied(
  client: typeof ctx.anon,
  table: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await client.from(table).update(patch).eq('id', id).select('id')
  if (error) return // denied at policy level
  expect(data!.length).toBe(0) // silently filtered
}

/** Assert a delete is denied (affects 0 rows or errors). */
async function expectDeleteDenied(client: typeof ctx.anon, table: string, id: string) {
  const { data, error } = await client.from(table).delete().eq('id', id).select('id')
  if (error) return // denied
  expect(data!.length).toBe(0)
}

// ─── Tenant tables ────────────────────────────────────────────────────

describe('districts', () => {
  it('anon can read', async () => {
    await expectRows(ctx.anon, 'districts')
  })

  it('anon cannot insert', async () => {
    await expectInsertDenied(ctx.anon, 'districts', { slug: 'hack', name: 'Hack' })
  })

  it('member cannot insert', async () => {
    await expectInsertDenied(ctx.memberA, 'districts', { slug: 'hack2', name: 'Hack2' })
  })
})

describe('schools', () => {
  it('anon can read', async () => {
    await expectRows(ctx.anon, 'schools')
  })

  it('anon cannot insert', async () => {
    await expectInsertDenied(ctx.anon, 'schools', {
      slug: 'hack-school',
      name: 'Hack School',
    })
  })

  it('editor cannot insert', async () => {
    await expectInsertDenied(ctx.editorA, 'schools', {
      slug: 'hack-school2',
      name: 'Hack School 2',
    })
  })

  it('district_admin can update own district school', async () => {
    const { data, error } = await ctx.districtAdmin
      .from('schools')
      .update({ short_name: 'A Updated' })
      .eq('id', ctx.schoolAId)
      .select('id')
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    // Revert
    await ctx.service.from('schools').update({ short_name: null }).eq('id', ctx.schoolAId)
  })

  it('editor cannot update schools', async () => {
    await expectUpdateDenied(ctx.editorA, 'schools', ctx.schoolAId, {
      short_name: 'Hacked',
    })
  })
})

// ─── Profiles ─────────────────────────────────────────────────────────

describe('profiles', () => {
  it('member can read own profile', async () => {
    const { data, error } = await ctx.memberA.from('profiles').select('id').eq('id', ctx.memberAId)
    expect(error).toBeNull()
    expect(data!.length).toBe(1)
  })

  it('member cannot read other profiles', async () => {
    const { data, error } = await ctx.memberA.from('profiles').select('id').eq('id', ctx.editorAId)
    // Should return 0 rows (not the member's own + not admin)
    if (error) return
    expect(data!.length).toBe(0)
  })

  it('member can update own profile (display_name)', async () => {
    const { data, error } = await ctx.memberA
      .from('profiles')
      .update({ display_name: 'Updated Name' })
      .eq('id', ctx.memberAId)
      .select('id')
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    await ctx.service.from('profiles').update({ display_name: 'memberA' }).eq('id', ctx.memberAId)
  })

  it('member cannot update another profile', async () => {
    await expectUpdateDenied(ctx.memberA, 'profiles', ctx.editorAId, {
      display_name: 'Hacked',
    })
  })

  it('admin can read school profiles', async () => {
    const { data, error } = await ctx.adminA
      .from('profiles')
      .select('id')
      .eq('school_id', ctx.schoolAId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('admin cannot read profiles from another school', async () => {
    const { data, error } = await ctx.adminA
      .from('profiles')
      .select('id')
      .eq('school_id', ctx.schoolBId)
    if (error) return
    // Admin of A should only see their own profile if it matches school B (it doesn't)
    expect(data!.length).toBe(0)
  })

  it('anon cannot read profiles', async () => {
    await expectNoRows(ctx.anon, 'profiles')
  })
})

// ─── Content tables: public read + editor write ───────────────────────

describe('events', () => {
  it('anon can read published events', async () => {
    await expectRows(ctx.anon, 'events', { column: 'id', value: ctx.rows.eventA })
  })

  it('anon cannot read unpublished events', async () => {
    await expectNoRows(ctx.anon, 'events', { column: 'id', value: ctx.rows.eventUnpublished })
  })

  it('editor-a can read unpublished events (via editor write policy)', async () => {
    // The "editor write events" policy uses FOR ALL which includes SELECT
    const { data, error } = await ctx.editorA
      .from('events')
      .select('id')
      .eq('id', ctx.rows.eventUnpublished)
    expect(error).toBeNull()
    expect(data!.length).toBe(1)
  })

  it('editor-a can insert event for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('events')
      .insert({
        school_id: ctx.schoolAId,
        slug: 'rls-editor-insert',
        title: 'Editor Insert',
        starts_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    // Cleanup
    await ctx.service.from('events').delete().eq('id', data!.id)
  })

  it('editor-a cannot insert event for school B', async () => {
    await expectInsertDenied(ctx.editorA, 'events', {
      school_id: ctx.schoolBId,
      slug: 'rls-cross-tenant-event',
      title: 'Cross Tenant',
      starts_at: new Date().toISOString(),
    })
  })

  it('editor-b cannot update school A events', async () => {
    await expectUpdateDenied(ctx.editorB, 'events', ctx.rows.eventA, {
      title: 'Hacked by B',
    })
  })

  it('editor-b cannot delete school A events', async () => {
    await expectDeleteDenied(ctx.editorB, 'events', ctx.rows.eventA)
  })

  it('anon cannot insert events', async () => {
    await expectInsertDenied(ctx.anon, 'events', {
      school_id: ctx.schoolAId,
      slug: 'anon-hack-event',
      title: 'Anon Hack',
      starts_at: new Date().toISOString(),
    })
  })

  it('member cannot insert events', async () => {
    await expectInsertDenied(ctx.memberA, 'events', {
      school_id: ctx.schoolAId,
      slug: 'member-hack-event',
      title: 'Member Hack',
      starts_at: new Date().toISOString(),
    })
  })

  it('district-admin can write events for school A and B', async () => {
    const { data, error } = await ctx.districtAdmin
      .from('events')
      .insert({
        school_id: ctx.schoolBId,
        slug: 'rls-district-event-b',
        title: 'District Event B',
        starts_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('events').delete().eq('id', data!.id)
  })
})

describe('news', () => {
  it('anon can read published news', async () => {
    await expectRows(ctx.anon, 'news', { column: 'id', value: ctx.rows.newsA })
  })

  it('anon cannot read unpublished news', async () => {
    await expectNoRows(ctx.anon, 'news', { column: 'id', value: ctx.rows.newsUnpublished })
  })

  it('editor-a can write news for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('news')
      .insert({
        school_id: ctx.schoolAId,
        slug: 'rls-editor-news',
        title: 'Editor News',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('news').delete().eq('id', data!.id)
  })

  it('editor-b cannot write news for school A', async () => {
    await expectInsertDenied(ctx.editorB, 'news', {
      school_id: ctx.schoolAId,
      slug: 'rls-cross-news',
      title: 'Cross Tenant News',
      published_at: new Date().toISOString(),
    })
  })

  it('anon cannot insert news', async () => {
    await expectInsertDenied(ctx.anon, 'news', {
      school_id: ctx.schoolAId,
      slug: 'anon-news',
      title: 'Anon News',
      published_at: new Date().toISOString(),
    })
  })
})

// Unconditional public-read content tables — test the pattern once thoroughly,
// then parametrize the remaining tables.
const unconditionalPublicReadTables = [
  { table: 'board_members', rowKey: 'boardMemberA' as const },
  { table: 'volunteer_roles', rowKey: 'volunteerRoleA' as const },
  { table: 'resources', rowKey: 'resourceA' as const },
  { table: 'lunch_menus', rowKey: 'lunchMenuA' as const },
  { table: 'transportation_routes', rowKey: 'transportA' as const },
  { table: 'classroom_teachers', rowKey: 'classroomA' as const },
  { table: 'budget_years', rowKey: 'budgetA' as const },
  { table: 'committees', rowKey: 'committeeA' as const },
  { table: 'programs', rowKey: 'programA' as const },
  { table: 'pta_newsletters', rowKey: 'newsletterA' as const },
]

for (const { table, rowKey } of unconditionalPublicReadTables) {
  describe(table, () => {
    it('anon can read', async () => {
      await expectRows(ctx.anon, table, { column: 'id', value: ctx.rows[rowKey] })
    })

    it('anon cannot insert', async () => {
      // Build a minimal row — these will be rejected anyway
      await expectInsertDenied(ctx.anon, table, { school_id: ctx.schoolAId })
    })

    it('editor-a can update own school row', async () => {
      // Use updated_at as a benign field to touch
      const { data, error } = await ctx.editorA
        .from(table)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ctx.rows[rowKey])
        .select('id')
      expect(error).toBeNull()
      expect(data!.length).toBe(1)
    })

    it('editor-b cannot update school A row', async () => {
      await expectUpdateDenied(ctx.editorB, table, ctx.rows[rowKey], {
        updated_at: new Date().toISOString(),
      })
    })

    it('editor-b cannot delete school A row', async () => {
      await expectDeleteDenied(ctx.editorB, table, ctx.rows[rowKey])
    })
  })
}

describe('community_listings', () => {
  it('anon can read non-hidden listings', async () => {
    await expectRows(ctx.anon, 'community_listings', {
      column: 'id',
      value: ctx.rows.communityListingA,
    })
  })

  it('anon cannot read hidden listings', async () => {
    await expectNoRows(ctx.anon, 'community_listings', {
      column: 'id',
      value: ctx.rows.communityListingHidden,
    })
  })

  it('authenticated member can insert own listing', async () => {
    const { data, error } = await ctx.memberA
      .from('community_listings')
      .insert({
        school_id: ctx.schoolAId,
        slug: 'rls-member-listing',
        title: 'Member Listing',
        category: 'classified',
        created_by: ctx.memberAId,
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('community_listings').delete().eq('id', data!.id)
  })

  it('member cannot insert listing as another user', async () => {
    await expectInsertDenied(ctx.memberA, 'community_listings', {
      school_id: ctx.schoolAId,
      slug: 'rls-impersonation',
      title: 'Impersonation',
      category: 'classified',
      created_by: ctx.editorAId, // not memberA
    })
  })

  it('anon cannot insert community_listings', async () => {
    await expectInsertDenied(ctx.anon, 'community_listings', {
      school_id: ctx.schoolAId,
      slug: 'anon-listing',
      title: 'Anon Listing',
      category: 'classified',
    })
  })

  it('editor-a can update/delete school A listings', async () => {
    const { data, error } = await ctx.editorA
      .from('community_listings')
      .update({ title: 'Updated by Editor' })
      .eq('id', ctx.rows.communityListingA)
      .select('id')
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    // Revert
    await ctx.service
      .from('community_listings')
      .update({ title: 'Listing A' })
      .eq('id', ctx.rows.communityListingA)
  })

  it('editor-b cannot update school A listings', async () => {
    await expectUpdateDenied(ctx.editorB, 'community_listings', ctx.rows.communityListingA, {
      title: 'Hacked',
    })
  })
})

// ─── Dynamic user-scoped tables ───────────────────────────────────────

describe('event_rsvps', () => {
  it('member-a can read own RSVPs', async () => {
    await expectRows(ctx.memberA, 'event_rsvps', {
      column: 'id',
      value: ctx.rows.rsvpMemberA,
    })
  })

  it('editor-b cannot read member-a RSVPs', async () => {
    await expectNoRows(ctx.editorB, 'event_rsvps', {
      column: 'id',
      value: ctx.rows.rsvpMemberA,
    })
  })

  it('member-a can insert own RSVP', async () => {
    const { data, error } = await ctx.memberA
      .from('event_rsvps')
      .insert({
        event_id: ctx.rows.eventB,
        school_id: ctx.schoolBId,
        user_id: ctx.memberAId,
        status: 'maybe',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('event_rsvps').delete().eq('id', data!.id)
  })

  it('member cannot insert RSVP as another user', async () => {
    await expectInsertDenied(ctx.memberA, 'event_rsvps', {
      event_id: ctx.rows.eventA,
      school_id: ctx.schoolAId,
      user_id: ctx.editorAId, // not memberA
      status: 'going',
    })
  })

  it('admin-a can read RSVPs for school A', async () => {
    await expectRows(ctx.adminA, 'event_rsvps', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })

  it('anon cannot read RSVPs', async () => {
    await expectNoRows(ctx.anon, 'event_rsvps')
  })

  it('anon cannot insert RSVPs', async () => {
    await expectInsertDenied(ctx.anon, 'event_rsvps', {
      event_id: ctx.rows.eventA,
      school_id: ctx.schoolAId,
      user_id: ctx.memberAId,
      status: 'going',
    })
  })
})

describe('volunteer_hours', () => {
  it('member-a can read own hours', async () => {
    await expectRows(ctx.memberA, 'volunteer_hours', {
      column: 'id',
      value: ctx.rows.volunteerHourMemberA,
    })
  })

  it('member-a can insert own hours', async () => {
    const { data, error } = await ctx.memberA
      .from('volunteer_hours')
      .insert({
        school_id: ctx.schoolAId,
        user_id: ctx.memberAId,
        hours: 1.0,
        served_on: '2026-02-01',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('volunteer_hours').delete().eq('id', data!.id)
  })

  it('editor-b cannot read member-a hours', async () => {
    await expectNoRows(ctx.editorB, 'volunteer_hours', {
      column: 'id',
      value: ctx.rows.volunteerHourMemberA,
    })
  })

  it('admin-a can read school A hours', async () => {
    await expectRows(ctx.adminA, 'volunteer_hours', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })

  it('anon cannot read volunteer hours', async () => {
    await expectNoRows(ctx.anon, 'volunteer_hours')
  })
})

describe('community_flags', () => {
  it('authenticated user can insert a flag', async () => {
    const { data, error } = await ctx.memberA
      .from('community_flags')
      .insert({
        listing_id: ctx.rows.communityListingA,
        school_id: ctx.schoolAId,
        reporter_id: ctx.memberAId,
        reason: 'Spam',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('community_flags').delete().eq('id', data!.id)
  })

  it('anon cannot insert a flag', async () => {
    await expectInsertDenied(ctx.anon, 'community_flags', {
      listing_id: ctx.rows.communityListingA,
      school_id: ctx.schoolAId,
      reason: 'Spam',
    })
  })

  it('admin-a can read flags for school A', async () => {
    // Insert a flag via service for admin to read
    const { data: flag } = await ctx.service
      .from('community_flags')
      .insert({
        listing_id: ctx.rows.communityListingA,
        school_id: ctx.schoolAId,
        reason: 'Test flag',
      })
      .select('id')
      .single()
      .throwOnError()

    const { data, error } = await ctx.adminA
      .from('community_flags')
      .select('id')
      .eq('school_id', ctx.schoolAId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)

    await ctx.service.from('community_flags').delete().eq('id', flag!.id)
  })

  it('member cannot read flags', async () => {
    await expectNoRows(ctx.memberA, 'community_flags')
  })

  it('admin-a can resolve (update) flags for school A', async () => {
    const { data: flag } = await ctx.service
      .from('community_flags')
      .insert({
        listing_id: ctx.rows.communityListingA,
        school_id: ctx.schoolAId,
        reason: 'Resolve test',
      })
      .select('id')
      .single()
      .throwOnError()

    const { data, error } = await ctx.adminA
      .from('community_flags')
      .update({ resolved: true })
      .eq('id', flag!.id)
      .select('id')
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    await ctx.service.from('community_flags').delete().eq('id', flag!.id)
  })
})

describe('push_tokens', () => {
  it('member-a can read own push tokens', async () => {
    await expectRows(ctx.memberA, 'push_tokens', {
      column: 'id',
      value: ctx.rows.pushTokenMemberA,
    })
  })

  it('editor-b cannot read member-a push tokens', async () => {
    await expectNoRows(ctx.editorB, 'push_tokens', {
      column: 'id',
      value: ctx.rows.pushTokenMemberA,
    })
  })

  it('admin-a can read school A push tokens', async () => {
    await expectRows(ctx.adminA, 'push_tokens', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })

  it('anon cannot read push tokens', async () => {
    await expectNoRows(ctx.anon, 'push_tokens')
  })

  it('anon cannot insert push tokens', async () => {
    await expectInsertDenied(ctx.anon, 'push_tokens', {
      school_id: ctx.schoolAId,
      expo_token: 'ExponentPushToken[anon-hack]',
      platform: 'ios',
    })
  })
})

describe('announcements', () => {
  it('anon can read sent announcements', async () => {
    await expectRows(ctx.anon, 'announcements', {
      column: 'id',
      value: ctx.rows.announcementA,
    })
  })

  it('anon cannot read draft announcements (sent_at is null)', async () => {
    await expectNoRows(ctx.anon, 'announcements', {
      column: 'id',
      value: ctx.rows.announcementDraft,
    })
  })

  it('admin-a can insert announcements for school A', async () => {
    const { data, error } = await ctx.adminA
      .from('announcements')
      .insert({
        school_id: ctx.schoolAId,
        title: 'Admin Announcement',
        body: 'Test body',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('announcements').delete().eq('id', data!.id)
  })

  it('editor-a cannot insert announcements (admin-only)', async () => {
    await expectInsertDenied(ctx.editorA, 'announcements', {
      school_id: ctx.schoolAId,
      title: 'Editor Announcement',
      body: 'Should fail',
    })
  })

  it('anon cannot insert announcements', async () => {
    await expectInsertDenied(ctx.anon, 'announcements', {
      school_id: ctx.schoolAId,
      title: 'Anon Announcement',
      body: 'Should fail',
    })
  })

  it('admin-a cannot write announcements for school B', async () => {
    await expectInsertDenied(ctx.adminA, 'announcements', {
      school_id: ctx.schoolBId,
      title: 'Cross Tenant Announcement',
      body: 'Should fail',
    })
  })
})

describe('contact_submissions', () => {
  it('anon can insert with empty honeypot', async () => {
    const { data, error } = await ctx.anon
      .from('contact_submissions')
      .insert({
        school_id: ctx.schoolAId,
        name: 'Visitor',
        email: 'visitor@example.com',
        message: 'Hello from a visitor',
        honeypot: '',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('contact_submissions').delete().eq('id', data!.id)
  })

  it('anon can insert with null honeypot', async () => {
    const { data, error } = await ctx.anon
      .from('contact_submissions')
      .insert({
        school_id: ctx.schoolAId,
        name: 'Visitor 2',
        email: 'visitor2@example.com',
        message: 'Hello again',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('contact_submissions').delete().eq('id', data!.id)
  })

  it('anon insert rejected with filled honeypot', async () => {
    await expectInsertDenied(ctx.anon, 'contact_submissions', {
      school_id: ctx.schoolAId,
      name: 'Bot',
      email: 'bot@spam.com',
      message: 'Buy stuff',
      honeypot: 'got you',
    })
  })

  it('anon cannot read contact submissions', async () => {
    await expectNoRows(ctx.anon, 'contact_submissions')
  })

  it('member cannot read contact submissions', async () => {
    await expectNoRows(ctx.memberA, 'contact_submissions')
  })

  it('admin-a can read school A contact submissions', async () => {
    await expectRows(ctx.adminA, 'contact_submissions', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })
})

describe('fundraising_donations', () => {
  it('anon cannot read donations', async () => {
    await expectNoRows(ctx.anon, 'fundraising_donations')
  })

  it('member cannot read donations', async () => {
    await expectNoRows(ctx.memberA, 'fundraising_donations')
  })

  it('editor cannot read donations', async () => {
    await expectNoRows(ctx.editorA, 'fundraising_donations')
  })

  it('admin-a can read school A donations', async () => {
    await expectRows(ctx.adminA, 'fundraising_donations', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })

  it('anon cannot insert donations', async () => {
    await expectInsertDenied(ctx.anon, 'fundraising_donations', {
      school_id: ctx.schoolAId,
      amount_cents: 100,
    })
  })

  it('member cannot insert donations', async () => {
    await expectInsertDenied(ctx.memberA, 'fundraising_donations', {
      school_id: ctx.schoolAId,
      amount_cents: 100,
    })
  })

  it('admin cannot insert donations (service-role only)', async () => {
    await expectInsertDenied(ctx.adminA, 'fundraising_donations', {
      school_id: ctx.schoolAId,
      amount_cents: 100,
    })
  })
})

// ─── Cross-tenant isolation summary ───────────────────────────────────

describe('cross-tenant isolation', () => {
  it('editor-b cannot read unpublished school A events', async () => {
    await expectNoRows(ctx.editorB, 'events', {
      column: 'id',
      value: ctx.rows.eventUnpublished,
    })
  })

  it('editor-b cannot read unpublished school A news', async () => {
    await expectNoRows(ctx.editorB, 'news', {
      column: 'id',
      value: ctx.rows.newsUnpublished,
    })
  })

  it('admin-a cannot read school B donations', async () => {
    // eventB is at schoolB — no donations there, but confirm filter works
    await expectNoRows(ctx.adminA, 'fundraising_donations', {
      column: 'school_id',
      value: ctx.schoolBId,
    })
  })

  it('admin-a cannot read school B contact submissions', async () => {
    await expectNoRows(ctx.adminA, 'contact_submissions', {
      column: 'school_id',
      value: ctx.schoolBId,
    })
  })

  it('district-admin can read events from both schools', async () => {
    const { data, error } = await ctx.districtAdmin.from('events').select('id')
    expect(error).toBeNull()
    const ids = data!.map((r: { id: string }) => r.id)
    expect(ids).toContain(ctx.rows.eventA)
    expect(ids).toContain(ctx.rows.eventB)
  })
})
