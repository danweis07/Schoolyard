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

// ─── Spirit Store ────────────────────────────────────────────────────

describe('spirit_store_products', () => {
  it('anon can read active products', async () => {
    await expectRows(ctx.anon, 'spirit_store_products', {
      column: 'id',
      value: ctx.rows.spiritProductA,
    })
  })

  it('anon cannot read inactive products', async () => {
    await expectNoRows(ctx.anon, 'spirit_store_products', {
      column: 'id',
      value: ctx.rows.spiritProductInactive,
    })
  })

  it('anon cannot insert products', async () => {
    await expectInsertDenied(ctx.anon, 'spirit_store_products', {
      school_id: ctx.schoolAId,
      slug: 'anon-hack-product',
      name: 'Hack',
      price_cents: 1000,
    })
  })

  it('editor-a can insert product for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('spirit_store_products')
      .insert({
        school_id: ctx.schoolAId,
        slug: 'rls-editor-product',
        name: 'Editor Product',
        price_cents: 1500,
// ─── Forms & Conferences ──────────────────────────────────────────────

describe('forms', () => {
  it('anon can read published forms', async () => {
    await expectRows(ctx.anon, 'forms', { column: 'id', value: ctx.rows.formPublished })
  })

  it('anon cannot read unpublished forms', async () => {
    await expectNoRows(ctx.anon, 'forms', { column: 'id', value: ctx.rows.formUnpublished })
  })

  it('editor-a can insert form for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('forms')
      .insert({
        school_id: ctx.schoolAId,
        slug: 'rls-editor-form',
        title: 'Editor Form',
        fields: [{ name: 'q1', label: 'Question 1', type: 'text', required: false }],
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('spirit_store_products').delete().eq('id', data!.id)
  })

  it('editor-b cannot insert product for school A', async () => {
    await expectInsertDenied(ctx.editorB, 'spirit_store_products', {
      school_id: ctx.schoolAId,
      slug: 'rls-cross-product',
      name: 'Cross Tenant Product',
      price_cents: 1000,
    })
  })

  it('editor-b cannot update school A products', async () => {
    await expectUpdateDenied(ctx.editorB, 'spirit_store_products', ctx.rows.spiritProductA, {
      name: 'Hacked',
    })
  })

  it('editor-b cannot delete school A products', async () => {
    await expectDeleteDenied(ctx.editorB, 'spirit_store_products', ctx.rows.spiritProductA)
  })
})

describe('spirit_store_orders', () => {
  it('anon cannot read orders', async () => {
    await expectNoRows(ctx.anon, 'spirit_store_orders')
  })

  it('member-a can read own orders', async () => {
    await expectRows(ctx.memberA, 'spirit_store_orders', {
      column: 'id',
      value: ctx.rows.spiritOrderMemberA,
    })
  })

  it('editor-b cannot read member-a orders', async () => {
    await expectNoRows(ctx.editorB, 'spirit_store_orders', {
      column: 'id',
      value: ctx.rows.spiritOrderMemberA,
    })
  })

  it('admin-a can read school A orders', async () => {
    await expectRows(ctx.adminA, 'spirit_store_orders', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })

  it('admin-a cannot read school B orders', async () => {
    await expectNoRows(ctx.adminA, 'spirit_store_orders', {
      column: 'school_id',
      value: ctx.schoolBId,
    })
  })

  it('anon cannot insert orders (service-role only)', async () => {
    await expectInsertDenied(ctx.anon, 'spirit_store_orders', {
      school_id: ctx.schoolAId,
      customer_name: 'Anon',
      customer_email: 'anon@example.com',
      total_cents: 1500,
    })
  })

  it('member cannot insert orders directly (service-role only)', async () => {
    await expectInsertDenied(ctx.memberA, 'spirit_store_orders', {
      school_id: ctx.schoolAId,
      user_id: ctx.memberAId,
      customer_name: 'Member',
      customer_email: 'member@example.com',
      total_cents: 1500,
    })
  })

  it('admin-a can update order status', async () => {
    const { data, error } = await ctx.adminA
      .from('spirit_store_orders')
      .update({ status: 'fulfilled' })
      .eq('id', ctx.rows.spiritOrderMemberA)
    // Cleanup
    await ctx.service.from('forms').delete().eq('id', data!.id)
  })

  it('editor-a can update form for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('forms')
      .update({ title: 'Updated Form Title' })
      .eq('id', ctx.rows.formPublished)
      .select('id')
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    // Revert
    await ctx.service
      .from('spirit_store_orders')
      .update({ status: 'pending' })
      .eq('id', ctx.rows.spiritOrderMemberA)
  })
})

describe('spirit_store_order_lines', () => {
  it('member-a can read own order lines', async () => {
    await expectRows(ctx.memberA, 'spirit_store_order_lines', {
      column: 'id',
      value: ctx.rows.spiritOrderLineMemberA,
    })
  })

  it('editor-b cannot read member-a order lines', async () => {
    await expectNoRows(ctx.editorB, 'spirit_store_order_lines', {
      column: 'id',
      value: ctx.rows.spiritOrderLineMemberA,
    })
  })

  it('admin-a can read school A order lines', async () => {
    await expectRows(ctx.adminA, 'spirit_store_order_lines', {
      column: 'id',
      value: ctx.rows.spiritOrderLineMemberA,
    })
  })

  it('anon cannot read order lines', async () => {
    await expectNoRows(ctx.anon, 'spirit_store_order_lines')
  })
})

// ─── School Directory ────────────────────────────────────────────────

describe('directory_entries', () => {
  it('anon cannot read directory entries', async () => {
    await expectNoRows(ctx.anon, 'directory_entries')
  })

  it('member-a can read visible entries from same school', async () => {
    await expectRows(ctx.memberA, 'directory_entries', {
      column: 'id',
      value: ctx.rows.directoryEntryVisible,
    })
  })

  it('member-a cannot read hidden entries', async () => {
    await expectNoRows(ctx.memberA, 'directory_entries', {
      column: 'id',
      value: ctx.rows.directoryEntryHidden,
    })
  })

  it('editor-b (different school) cannot read school A directory', async () => {
    await expectNoRows(ctx.editorB, 'directory_entries', {
      column: 'id',
      value: ctx.rows.directoryEntryVisible,
    })
  })

  it('member-a can insert own entry', async () => {
    const { data, error } = await ctx.memberA
      .from('directory_entries')
      .insert({
        school_id: ctx.schoolAId,
        user_id: ctx.memberAId,
        family_name: 'RLS Test Family',
        email: 'rls@test.com',
      .from('forms')
      .update({ title: 'Published Form' })
      .eq('id', ctx.rows.formPublished)
  })

  it('editor-b cannot insert form for school A', async () => {
    await expectInsertDenied(ctx.editorB, 'forms', {
      school_id: ctx.schoolAId,
      slug: 'rls-cross-form',
      title: 'Cross Tenant Form',
      fields: [],
    })
  })

  it('editor-b cannot update form for school A', async () => {
    await expectUpdateDenied(ctx.editorB, 'forms', ctx.rows.formPublished, {
      title: 'Hacked by B',
    })
  })

  it('member cannot insert forms', async () => {
    await expectInsertDenied(ctx.memberA, 'forms', {
      school_id: ctx.schoolAId,
      slug: 'rls-member-form',
      title: 'Member Form',
      fields: [],
    })
  })

  it('anon cannot insert forms', async () => {
    await expectInsertDenied(ctx.anon, 'forms', {
      school_id: ctx.schoolAId,
      slug: 'rls-anon-form',
      title: 'Anon Form',
      fields: [],
    })
  })
})

describe('form_responses', () => {
  it('member-a can insert own response', async () => {
    const { data, error } = await ctx.memberA
      .from('form_responses')
      .insert({
        form_id: ctx.rows.formPublished,
        school_id: ctx.schoolAId,
        user_id: ctx.memberAId,
        student_name: 'New Student',
        responses: { student_name: 'New Student' },
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    await ctx.service.from('directory_entries').delete().eq('id', data!.id)
  })

  it('member-a cannot insert entry as another user', async () => {
    await expectInsertDenied(ctx.memberA, 'directory_entries', {
      school_id: ctx.schoolAId,
      user_id: ctx.editorAId, // not memberA
      family_name: 'Impersonation',
    })
  })

  it('admin-a can read all entries (including hidden) for school A', async () => {
    const { data, error } = await ctx.adminA
      .from('directory_entries')
      .select('id')
      .eq('school_id', ctx.schoolAId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2) // visible + hidden
  })

  it('admin-a cannot read school B directory entries', async () => {
    await expectNoRows(ctx.adminA, 'directory_entries', {
      column: 'school_id',
      value: ctx.schoolBId,
    // Cleanup
    await ctx.service.from('form_responses').delete().eq('id', data!.id)
  })

  it('member-a can read own responses', async () => {
    await expectRows(ctx.memberA, 'form_responses', {
      column: 'id',
      value: ctx.rows.formResponseMemberA,
    })
  })

  it('member-a cannot insert response with a different user_id', async () => {
    await expectInsertDenied(ctx.memberA, 'form_responses', {
      form_id: ctx.rows.formPublished,
      school_id: ctx.schoolAId,
      user_id: ctx.editorAId, // not memberA
      student_name: 'Impersonation Student',
      responses: { student_name: 'Impersonation' },
    })
  })

  it('admin-a can read all responses for school A', async () => {
    await expectRows(ctx.adminA, 'form_responses', {
      column: 'school_id',
      value: ctx.schoolAId,
    })
  })

  it('editor-b cannot read member-a responses', async () => {
    await expectNoRows(ctx.editorB, 'form_responses', {
      column: 'id',
      value: ctx.rows.formResponseMemberA,
    })
  })

  it('anon cannot read responses', async () => {
    await expectNoRows(ctx.anon, 'form_responses')
  })

  it('anon cannot insert responses', async () => {
    await expectInsertDenied(ctx.anon, 'form_responses', {
      form_id: ctx.rows.formPublished,
      school_id: ctx.schoolAId,
      user_id: ctx.memberAId,
      student_name: 'Anon Student',
      responses: { student_name: 'Anon' },
    })
  })
})

describe('conference_windows', () => {
  it('anon can read published windows', async () => {
    await expectRows(ctx.anon, 'conference_windows', {
      column: 'id',
      value: ctx.rows.conferenceWindowPublished,
    })
  })

  it('anon cannot read unpublished windows', async () => {
    await expectNoRows(ctx.anon, 'conference_windows', {
      column: 'id',
      value: ctx.rows.conferenceWindowUnpublished,
    })
  })

  it('editor-a can write windows for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('conference_windows')
      .insert({
        school_id: ctx.schoolAId,
        slug: 'rls-editor-cw',
        title: 'Editor Conference Window',
        starts_on: '2026-12-01',
        ends_on: '2026-12-03',
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    // Cleanup
    await ctx.service.from('conference_windows').delete().eq('id', data!.id)
  })

  it('editor-b cannot write windows for school A', async () => {
    await expectInsertDenied(ctx.editorB, 'conference_windows', {
      school_id: ctx.schoolAId,
      slug: 'rls-cross-cw',
      title: 'Cross Tenant Window',
      starts_on: '2026-12-01',
      ends_on: '2026-12-03',
    })
  })
})

describe('conference_slots', () => {
  it('anon can read slots under published windows', async () => {
    await expectRows(ctx.anon, 'conference_slots', {
      column: 'id',
      value: ctx.rows.conferenceSlotOpen,
    })
  })

  it('editor-a can insert slots for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('conference_slots')
      .insert({
        window_id: ctx.rows.conferenceWindowPublished,
        school_id: ctx.schoolAId,
        teacher_id: ctx.editorAId,
        teacher_name: 'Teacher A',
        date: '2026-10-16',
        start_time: '14:00',
        end_time: '14:15',
        duration_minutes: 15,
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    // Cleanup
    await ctx.service.from('conference_slots').delete().eq('id', data!.id)
  })

  it('editor-a can update slots for school A', async () => {
    const { data, error } = await ctx.editorA
      .from('conference_slots')
      .update({ location: 'Room 101' })
      .eq('id', ctx.rows.conferenceSlotOpen)
      .select('id')
    expect(error).toBeNull()
    expect(data!.length).toBe(1)

    // Revert
    await ctx.service
      .from('conference_slots')
      .update({ location: null })
      .eq('id', ctx.rows.conferenceSlotOpen)
  })

  it('editor-b cannot update school A slots', async () => {
    await expectUpdateDenied(ctx.editorB, 'conference_slots', ctx.rows.conferenceSlotOpen, {
      location: 'Hacked Room',
    })
  })
})

describe('book_conference_slot RPC', () => {
  it('member-a can book an available slot', async () => {
    const { data, error } = await ctx.memberA.rpc('book_conference_slot', {
      p_slot_id: ctx.rows.conferenceSlotOpen,
      p_student_name: 'Member A Child',
    })
    expect(error).toBeNull()
    expect(data).toBe(true)

    // Revert booking for subsequent tests
    await ctx.service
      .from('conference_slots')
      .update({ booked_by: null, booked_at: null, student_name: null })
      .eq('id', ctx.rows.conferenceSlotOpen)
  })

  it('booking an already-booked slot returns false', async () => {
    const { data, error } = await ctx.memberA.rpc('book_conference_slot', {
      p_slot_id: ctx.rows.conferenceSlotBooked,
      p_student_name: 'Should Fail',
    })
    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('booking same teacher twice in same window returns false', async () => {
    // First book one slot for memberA
    await ctx.service
      .from('conference_slots')
      .update({
        booked_by: ctx.memberAId,
        booked_at: new Date().toISOString(),
        student_name: 'First Booking',
      })
      .eq('id', ctx.rows.conferenceSlotOpen)

    // Now try to book another slot for the same teacher in the same window
    const { data, error } = await ctx.memberA.rpc('book_conference_slot', {
      p_slot_id: ctx.rows.conferenceSlotOpen2,
      p_student_name: 'Second Booking',
    })
    expect(error).toBeNull()
    expect(data).toBe(false)

    // Revert
    await ctx.service
      .from('conference_slots')
      .update({ booked_by: null, booked_at: null, student_name: null })
      .eq('id', ctx.rows.conferenceSlotOpen)
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
