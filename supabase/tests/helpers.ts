/**
 * RLS test helpers — set up two schools, six auth profiles, and seed content
 * via the service role client (bypasses RLS). Each profile gets a typed
 * Supabase client that respects RLS for the assertions.
 *
 * Requires a running local Supabase stack: `supabase start` from repo root.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Local Supabase defaults (from `supabase start` output)
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export interface TestContext {
  /** Service role client — bypasses RLS. For setup/teardown only. */
  service: SupabaseClient
  /** Anon client — no auth, public access only. */
  anon: SupabaseClient
  /** member-a: signed-in member at school A */
  memberA: SupabaseClient
  /** editor-a: editor at school A */
  editorA: SupabaseClient
  /** editor-b: editor at school B (cross-tenant probe) */
  editorB: SupabaseClient
  /** admin-a: admin at school A */
  adminA: SupabaseClient
  /** district-admin: district_admin with visibility across A + B */
  districtAdmin: SupabaseClient

  districtId: string
  schoolAId: string
  schoolBId: string
  memberAId: string
  editorAId: string
  editorBId: string
  adminAId: string
  districtAdminId: string

  /** Pre-inserted row IDs for assertions */
  rows: {
    eventA: string
    eventB: string
    eventUnpublished: string
    newsA: string
    newsUnpublished: string
    boardMemberA: string
    volunteerRoleA: string
    resourceA: string
    lunchMenuA: string
    transportA: string
    communityListingA: string
    communityListingHidden: string
    classroomA: string
    budgetA: string
    committeeA: string
    programA: string
    newsletterA: string
    rsvpMemberA: string
    volunteerHourMemberA: string
    announcementA: string
    announcementDraft: string
    contactSubmissionA: string
    donationA: string
    pushTokenMemberA: string
    spiritProductA: string
    spiritProductInactive: string
    spiritOrderMemberA: string
    spiritOrderLineMemberA: string
    directoryEntryVisible: string
    directoryEntryHidden: string
  }
}

function makeServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function makeAuthedClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  return client
}

const TEST_PASSWORD = 'test-password-123!'

const TEST_USERS = [
  { key: 'memberA', email: 'member-a@test.schoolyard.dev', role: 'member', school: 'A' },
  { key: 'editorA', email: 'editor-a@test.schoolyard.dev', role: 'editor', school: 'A' },
  { key: 'editorB', email: 'editor-b@test.schoolyard.dev', role: 'editor', school: 'B' },
  { key: 'adminA', email: 'admin-a@test.schoolyard.dev', role: 'admin', school: 'A' },
  {
    key: 'districtAdmin',
    email: 'district-admin@test.schoolyard.dev',
    role: 'district_admin',
    school: 'A',
  },
] as const

export async function setupTestContext(): Promise<TestContext> {
  const service = makeServiceClient()

  // ── Create district + two schools ────────────────────────────────
  const { data: district } = await service
    .from('districts')
    .insert({ slug: 'rls-test-district', name: 'RLS Test District' })
    .select('id')
    .single()
    .throwOnError()

  const districtId = district!.id

  const { data: schoolA } = await service
    .from('schools')
    .insert({
      slug: 'rls-test-school-a',
      name: 'School A',
      district_id: districtId,
    })
    .select('id')
    .single()
    .throwOnError()

  const { data: schoolB } = await service
    .from('schools')
    .insert({
      slug: 'rls-test-school-b',
      name: 'School B',
      district_id: districtId,
    })
    .select('id')
    .single()
    .throwOnError()

  const schoolAId = schoolA!.id
  const schoolBId = schoolB!.id

  // ── Create auth users + profiles ─────────────────────────────────
  const userIds: Record<string, string> = {}

  for (const u of TEST_USERS) {
    const { data: authUser, error } = await service.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create user ${u.email}: ${error.message}`)

    const userId = authUser.user.id
    userIds[u.key] = userId

    const schoolId = u.school === 'A' ? schoolAId : schoolBId
    await service
      .from('profiles')
      .upsert({
        id: userId,
        display_name: u.key,
        school_id: schoolId,
        district_id: u.role === 'district_admin' ? districtId : null,
        role: u.role,
      })
      .throwOnError()
  }

  // ── Seed content for school A ────────────────────────────────────
  const rows: Record<string, string> = {}

  // Events
  const { data: eventA } = await service
    .from('events')
    .insert({
      school_id: schoolAId,
      slug: 'rls-event-a',
      title: 'Event A',
      starts_at: new Date().toISOString(),
      published: true,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.eventA = eventA!.id

  const { data: eventB } = await service
    .from('events')
    .insert({
      school_id: schoolBId,
      slug: 'rls-event-b',
      title: 'Event B',
      starts_at: new Date().toISOString(),
      published: true,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.eventB = eventB!.id

  const { data: eventUnpub } = await service
    .from('events')
    .insert({
      school_id: schoolAId,
      slug: 'rls-event-unpublished',
      title: 'Unpublished Event',
      starts_at: new Date().toISOString(),
      published: false,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.eventUnpublished = eventUnpub!.id

  // News
  const { data: newsA } = await service
    .from('news')
    .insert({
      school_id: schoolAId,
      slug: 'rls-news-a',
      title: 'News A',
      published_at: new Date().toISOString(),
      published: true,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.newsA = newsA!.id

  const { data: newsUnpub } = await service
    .from('news')
    .insert({
      school_id: schoolAId,
      slug: 'rls-news-unpublished',
      title: 'Unpublished News',
      published_at: new Date().toISOString(),
      published: false,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.newsUnpublished = newsUnpub!.id

  // Board members
  const { data: boardA } = await service
    .from('board_members')
    .insert({ school_id: schoolAId, slug: 'rls-board-a', name: 'Board A', role: 'President' })
    .select('id')
    .single()
    .throwOnError()
  rows.boardMemberA = boardA!.id

  // Volunteer roles
  const { data: volRole } = await service
    .from('volunteer_roles')
    .insert({ school_id: schoolAId, slug: 'rls-vol-a', title: 'Vol A' })
    .select('id')
    .single()
    .throwOnError()
  rows.volunteerRoleA = volRole!.id

  // Resources
  const { data: resA } = await service
    .from('resources')
    .insert({
      school_id: schoolAId,
      slug: 'rls-resource-a',
      name: 'Resource A',
      category: 'food',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.resourceA = resA!.id

  // Lunch menus
  const { data: lunchA } = await service
    .from('lunch_menus')
    .insert({
      school_id: schoolAId,
      slug: 'rls-lunch-a',
      week_of: '2026-01-05',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.lunchMenuA = lunchA!.id

  // Transportation routes
  const { data: transA } = await service
    .from('transportation_routes')
    .insert({
      school_id: schoolAId,
      slug: 'rls-trans-a',
      route_number: '1',
      route_name: 'Route A',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.transportA = transA!.id

  // Community listings
  const { data: commA } = await service
    .from('community_listings')
    .insert({
      school_id: schoolAId,
      slug: 'rls-comm-a',
      title: 'Listing A',
      category: 'classified',
      hidden: false,
      created_by: userIds.memberA,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.communityListingA = commA!.id

  const { data: commHidden } = await service
    .from('community_listings')
    .insert({
      school_id: schoolAId,
      slug: 'rls-comm-hidden',
      title: 'Hidden Listing',
      category: 'classified',
      hidden: true,
      created_by: userIds.editorA,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.communityListingHidden = commHidden!.id

  // Classroom teachers
  const { data: classA } = await service
    .from('classroom_teachers')
    .insert({
      school_id: schoolAId,
      slug: 'rls-teacher-a',
      name: 'Teacher A',
      grade: '3rd',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.classroomA = classA!.id

  // Budget years
  const { data: budgetA } = await service
    .from('budget_years')
    .insert({
      school_id: schoolAId,
      slug: 'rls-budget-2025',
      year: 2025,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.budgetA = budgetA!.id

  // Committees
  const { data: commtA } = await service
    .from('committees')
    .insert({ school_id: schoolAId, slug: 'rls-committee-a', name: 'Committee A' })
    .select('id')
    .single()
    .throwOnError()
  rows.committeeA = commtA!.id

  // Programs
  const { data: progA } = await service
    .from('programs')
    .insert({ school_id: schoolAId, slug: 'rls-program-a', name: 'Program A' })
    .select('id')
    .single()
    .throwOnError()
  rows.programA = progA!.id

  // PTA Newsletters
  const { data: nlA } = await service
    .from('pta_newsletters')
    .insert({
      school_id: schoolAId,
      slug: 'rls-newsletter-a',
      title: 'Newsletter A',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()
    .throwOnError()
  rows.newsletterA = nlA!.id

  // ── Dynamic rows ─────────────────────────────────────────────────
  // RSVP for member-a
  const { data: rsvp } = await service
    .from('event_rsvps')
    .insert({
      event_id: rows.eventA,
      school_id: schoolAId,
      user_id: userIds.memberA,
      status: 'going',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.rsvpMemberA = rsvp!.id

  // Volunteer hours for member-a
  const { data: vh } = await service
    .from('volunteer_hours')
    .insert({
      school_id: schoolAId,
      user_id: userIds.memberA,
      hours: 2.5,
      served_on: '2026-01-15',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.volunteerHourMemberA = vh!.id

  // Announcement (sent)
  const { data: annSent } = await service
    .from('announcements')
    .insert({
      school_id: schoolAId,
      title: 'Sent Announcement',
      body: 'Body',
      sent_at: new Date().toISOString(),
      created_by: userIds.adminA,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.announcementA = annSent!.id

  // Announcement (draft — sent_at is null)
  const { data: annDraft } = await service
    .from('announcements')
    .insert({
      school_id: schoolAId,
      title: 'Draft Announcement',
      body: 'Draft body',
      sent_at: null,
      created_by: userIds.adminA,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.announcementDraft = annDraft!.id

  // Contact submission
  const { data: contact } = await service
    .from('contact_submissions')
    .insert({
      school_id: schoolAId,
      name: 'Test Person',
      email: 'test@example.com',
      message: 'Hello',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.contactSubmissionA = contact!.id

  // Donation (inserted via service role, like stripe webhook would)
  const { data: donation } = await service
    .from('fundraising_donations')
    .insert({
      school_id: schoolAId,
      amount_cents: 5000,
      donor_name: 'Test Donor',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.donationA = donation!.id

  // Push token for member-a
  const { data: pushToken } = await service
    .from('push_tokens')
    .insert({
      user_id: userIds.memberA,
      school_id: schoolAId,
      expo_token: 'ExponentPushToken[rls-test-token]',
      platform: 'ios',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.pushTokenMemberA = pushToken!.id

  // ── Spirit Store seed data ─────────────────────────────────────
  const { data: spiritProduct } = await service
    .from('spirit_store_products')
    .insert({
      school_id: schoolAId,
      slug: 'rls-eagle-tee',
      name: 'Eagle T-Shirt',
      price_cents: 1500,
      active: true,
      variants: [{ label: 'S' }, { label: 'M' }, { label: 'L' }],
    })
    .select('id')
    .single()
    .throwOnError()
  rows.spiritProductA = spiritProduct!.id

  const { data: spiritProductInactive } = await service
    .from('spirit_store_products')
    .insert({
      school_id: schoolAId,
      slug: 'rls-inactive-product',
      name: 'Inactive Product',
      price_cents: 999,
      active: false,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.spiritProductInactive = spiritProductInactive!.id

  // Order placed via service role (simulating edge function)
  const { data: spiritOrder } = await service
    .from('spirit_store_orders')
    .insert({
      school_id: schoolAId,
      user_id: userIds.memberA,
      customer_name: 'Member A',
      customer_email: 'member-a@test.com',
      total_cents: 1500,
      status: 'pending',
      payment_provider: 'collect',
    })
    .select('id')
    .single()
    .throwOnError()
  rows.spiritOrderMemberA = spiritOrder!.id

  const { data: spiritOrderLine } = await service
    .from('spirit_store_order_lines')
    .insert({
      order_id: spiritOrder!.id,
      product_id: spiritProduct!.id,
      variant_label: 'M',
      quantity: 1,
      unit_price_cents: 1500,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.spiritOrderLineMemberA = spiritOrderLine!.id

  // ── Directory seed data ────────────────────────────────────────
  const { data: dirVisible } = await service
    .from('directory_entries')
    .insert({
      school_id: schoolAId,
      user_id: userIds.editorA,
      family_name: 'Editor Family',
      parent_names: ['Editor A'],
      student_grades: ['3rd'],
      email: 'editor@test.com',
      visible: true,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.directoryEntryVisible = dirVisible!.id

  const { data: dirHidden } = await service
    .from('directory_entries')
    .insert({
      school_id: schoolAId,
      user_id: userIds.adminA,
      family_name: 'Hidden Family',
      parent_names: ['Admin A'],
      student_grades: ['K'],
      email: 'admin@test.com',
      visible: false,
    })
    .select('id')
    .single()
    .throwOnError()
  rows.directoryEntryHidden = dirHidden!.id

  // ── Sign in as each profile ──────────────────────────────────────
  const [memberA, editorA, editorB, adminA, districtAdmin] = await Promise.all([
    makeAuthedClient(TEST_USERS[0].email, TEST_PASSWORD),
    makeAuthedClient(TEST_USERS[1].email, TEST_PASSWORD),
    makeAuthedClient(TEST_USERS[2].email, TEST_PASSWORD),
    makeAuthedClient(TEST_USERS[3].email, TEST_PASSWORD),
    makeAuthedClient(TEST_USERS[4].email, TEST_PASSWORD),
  ])

  return {
    service,
    anon: makeAnonClient(),
    memberA,
    editorA,
    editorB,
    adminA,
    districtAdmin,

    districtId,
    schoolAId,
    schoolBId,
    memberAId: userIds.memberA,
    editorAId: userIds.editorA,
    editorBId: userIds.editorB,
    adminAId: userIds.adminA,
    districtAdminId: userIds.districtAdmin,

    rows: rows as TestContext['rows'],
  }
}

export async function teardownTestContext(ctx: TestContext): Promise<void> {
  const { service } = ctx

  // Delete in reverse-dependency order to avoid FK violations.
  // Dynamic tables first, then content, then tenant.
  const dynamicTables = [
    'spirit_store_order_lines',
    'spirit_store_orders',
    'directory_entries',
    'push_tokens',
    'community_flags',
    'volunteer_hours',
    'event_rsvps',
    'fundraising_donations',
    'contact_submissions',
    'announcements',
  ]
  const contentTables = [
    'spirit_store_products',
    'community_listings',
    'pta_newsletters',
    'programs',
    'committees',
    'budget_years',
    'classroom_teachers',
    'transportation_routes',
    'lunch_menus',
    'resources',
    'volunteer_roles',
    'board_members',
    'news',
    'events',
  ]

  for (const table of [...dynamicTables, ...contentTables]) {
    await service.from(table).delete().in('school_id', [ctx.schoolAId, ctx.schoolBId])
  }

  // Delete profiles (FK to auth.users)
  for (const uid of [
    ctx.memberAId,
    ctx.editorAId,
    ctx.editorBId,
    ctx.adminAId,
    ctx.districtAdminId,
  ]) {
    await service.from('profiles').delete().eq('id', uid)
  }

  // Delete auth users
  for (const uid of [
    ctx.memberAId,
    ctx.editorAId,
    ctx.editorBId,
    ctx.adminAId,
    ctx.districtAdminId,
  ]) {
    await service.auth.admin.deleteUser(uid)
  }

  // Delete schools and district
  await service.from('schools').delete().in('id', [ctx.schoolAId, ctx.schoolBId])
  await service.from('districts').delete().eq('id', ctx.districtId)
}
