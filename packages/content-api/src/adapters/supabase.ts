/**
 * Supabase adapter — reads live data from Postgres via @schoolyard/supabase.
 *
 * Each method queries the relevant table scoped to the current school
 * (resolved via the `Scope.schoolSlug` or the `defaultSchoolSlug` passed
 * at construction time), then maps Postgres rows back to the same shapes
 * the static adapter returns. Consumers that import types from
 * `@schoolyard/content-api` don't need to change.
 *
 * School-slug → school-id resolution is cached for the lifetime of the
 * adapter instance; a single weak map per client avoids refetching the
 * same lookup across calls.
 */
import type { SupabaseClient, Database } from '@schoolyard/supabase'

type Tables = Database['public']['Tables']
type EventRow = Tables['events']['Row']
type NewsRow = Tables['news']['Row']
type BoardMemberRow = Tables['board_members']['Row']
type VolunteerRoleRow = Tables['volunteer_roles']['Row']
type ResourceRow = Tables['resources']['Row']
type LunchMenuRow = Tables['lunch_menus']['Row']
type TransportationRouteRow = Tables['transportation_routes']['Row']
type CommunityListingRow = Tables['community_listings']['Row']
type ClassroomTeacherRow = Tables['classroom_teachers']['Row']
type BudgetYearRow = Tables['budget_years']['Row']
type CommitteeRow = Tables['committees']['Row']
type ProgramRow = Tables['programs']['Row']
type PtaNewsletterRow = Tables['pta_newsletters']['Row']
import type { ContentAdapter, FetchOptions, Scope, SchoolInfo } from './types.js'
import type {
  LunchMenu,
  TransportationRoute,
  CommunityListing,
  ClassroomTeacher,
  BudgetYear,
  Committee,
  Program,
  PtaNewsletter,
  BudgetLineItem,
  SpiritStoreProduct,
  DirectoryEntry,
  SchoolForm,
  ConferenceWindow,
  ConferenceSlot,
  FormFieldDefinition,
} from '../types.js'
import type {
  ManifestEvent,
  ManifestNewsPost,
  ManifestBoardMember,
  ManifestVolunteerRole,
  ManifestResource,
  ManifestIndex,
  ManifestConfig,
} from '../manifest.js'

export interface SupabaseAdapterOptions {
  /** Typed Supabase client. Pass either the browser or server variant. */
  client: SupabaseClient<Database>
  /**
   * Slug used when `Scope.schoolSlug` is omitted. In single-tenant
   * deployments this is the only school; in multi-tenant deployments it
   * defaults to whatever Astro middleware resolved from the request.
   */
  defaultSchoolSlug?: string
}

type SchoolLookupRow = Pick<
  Database['public']['Tables']['schools']['Row'],
  'id' | 'slug' | 'name' | 'short_name' | 'branding' | 'languages' | 'modules' | 'district_id'
>

export function createSupabaseAdapter(options: SupabaseAdapterOptions): ContentAdapter {
  const { client, defaultSchoolSlug } = options
  const schoolCache = new Map<string, SchoolLookupRow>()

  async function resolveSchool(scope?: Scope): Promise<SchoolLookupRow> {
    const slug = scope?.schoolSlug ?? defaultSchoolSlug
    if (!slug) {
      throw new Error('[supabase-adapter] no school slug provided and no defaultSchoolSlug was set')
    }
    const cached = schoolCache.get(slug)
    if (cached) return cached

    const { data, error } = await client
      .from('schools')
      .select('id, slug, name, short_name, branding, languages, modules, district_id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error(`[supabase-adapter] school not found: ${slug}`)
    schoolCache.set(slug, data)
    return data
  }

  return {
    async fetchSchools(districtId, fetchOptions): Promise<SchoolInfo[]> {
      let query = client
        .from('schools')
        .select('id, slug, name, short_name, branding, languages, modules, district_id')
        .order('name', { ascending: true })
      if (districtId) {
        query = query.eq('district_id', districtId)
      }
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as SchoolLookupRow[]).map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        shortName: row.short_name ?? row.name,
        branding: (row.branding ?? {}) as Record<string, unknown>,
        modules: (row.modules ?? {}) as Record<string, unknown>,
        languages: (row.languages ?? {}) as Record<string, unknown>,
        districtId: row.district_id,
      }))
    },

    async fetchManifest(scope, fetchOptions): Promise<ManifestIndex> {
      const school = await resolveSchool(scope)
      const languages = (school.languages ?? {}) as { supported?: string[] }
      const modules = (school.modules ?? {}) as Record<string, boolean>

      const counts = await loadCounts(client, school.id, fetchOptions)

      return {
        version: 1,
        generatedAt: new Date().toISOString(),
        tenantMode: school.district_id ? 'district' : 'single',
        tenantSlug: school.district_id ? school.slug : '',
        school: {
          name: school.name,
          shortName: school.short_name ?? school.name,
          mascot: '',
          tagline: '',
          district: '',
          timezone: '',
        },
        locales: languages.supported ?? ['en'],
        enabledModules: Object.entries(modules)
          .filter(([, v]) => v === true)
          .map(([k]) => k),
        counts,
      }
    },

    async fetchConfig(scope): Promise<ManifestConfig> {
      const school = await resolveSchool(scope)
      return {
        school: { name: school.name, shortName: school.short_name ?? school.name },
        branding: school.branding,
        languages: school.languages,
        modules: school.modules,
      }
    },

    async fetchEvents(scope, fetchOptions): Promise<ManifestEvent[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('events')
        .select('*')
        .eq('school_id', school.id)
        .eq('published', true)
        .order('starts_at', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as EventRow[]).map((row) => ({
        slug: row.slug,
        title: row.title,
        date: row.starts_at,
        endDate: row.ends_at ?? undefined,
        time: undefined,
        location: row.location ?? undefined,
        description: row.description ?? '',
        category:
          (row.category as ManifestEvent['category'] | null) ??
          ('other' as ManifestEvent['category']),
        registrationUrl: undefined,
        featured: row.featured,
        cancelled: row.cancelled,
        htmlBody: row.body_html ?? '',
      }))
    },

    async fetchNews(scope, fetchOptions): Promise<ManifestNewsPost[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('news')
        .select('*')
        .eq('school_id', school.id)
        .eq('published', true)
        .order('published_at', { ascending: false })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as NewsRow[]).map((row) => ({
        slug: row.slug,
        title: row.title,
        publishDate: row.published_at,
        author: row.author ?? undefined,
        summary: row.excerpt ?? '',
        tags: row.tags ?? [],
        featured: row.featured,
        image: row.image ?? undefined,
        imageAlt: row.image_alt ?? undefined,
        htmlBody: row.body_html ?? '',
      }))
    },

    async fetchBoard(scope, fetchOptions): Promise<ManifestBoardMember[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('board_members')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as BoardMemberRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        role: row.role,
        email: row.email ?? undefined,
        photo: row.photo_url ?? undefined,
        bio: row.bio_md ?? undefined,
        termStart: row.term_start ?? undefined,
        termEnd: row.term_end ?? undefined,
        order: row.sort_order,
        htmlBody: row.bio_html ?? '',
      }))
    },

    async fetchVolunteers(scope, fetchOptions): Promise<ManifestVolunteerRole[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('volunteer_roles')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as VolunteerRoleRow[]).map((row) => ({
        slug: row.slug,
        title: row.title,
        description: row.description_md ?? '',
        commitment: row.commitment ?? '',
        contact: row.contact_email ?? undefined,
        filled: row.capacity !== null && row.filled >= row.capacity,
        order: row.sort_order,
        htmlBody: row.description_html ?? '',
      }))
    },

    async fetchResources(scope, fetchOptions): Promise<ManifestResource[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('resources')
        .select('*')
        .eq('school_id', school.id)
        .order('name', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as ResourceRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        category: row.category as ManifestResource['category'],
        description: row.description ?? '',
        address: row.address ?? undefined,
        phone: row.phone ?? undefined,
        url: row.url ?? undefined,
        languages: row.languages ?? [],
        htmlBody: '',
      }))
    },

    async fetchLunchMenus(scope, fetchOptions): Promise<LunchMenu[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('lunch_menus')
        .select('*')
        .eq('school_id', school.id)
        .order('week_of', { ascending: false })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as LunchMenuRow[]).map((row) => ({
        slug: row.slug,
        weekOf: row.week_of,
        weekEnd: row.week_end ?? undefined,
        meals: (row.meals as Record<string, unknown>) ?? {},
        allergens: row.allergens ?? [],
        freeReducedNote: row.free_reduced_note ?? undefined,
        pdfUrl: row.pdf_url ?? undefined,
      }))
    },

    async fetchTransportationRoutes(scope, fetchOptions): Promise<TransportationRoute[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('transportation_routes')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as TransportationRouteRow[]).map((row) => ({
        slug: row.slug,
        routeNumber: row.route_number,
        routeName: row.route_name,
        driver: row.driver ?? undefined,
        morningArrival: row.morning_arrival ?? undefined,
        afternoonDeparture: row.afternoon_departure ?? undefined,
        stops: (row.stops as Array<Record<string, unknown>>) ?? [],
        notes: row.notes ?? undefined,
        order: row.sort_order,
      }))
    },

    async fetchCommunityListings(scope, fetchOptions): Promise<CommunityListing[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('community_listings')
        .select('*')
        .eq('school_id', school.id)
        .eq('hidden', false)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as CommunityListingRow[]).map((row) => ({
        slug: row.slug,
        title: row.title,
        category: row.category as CommunityListing['category'],
        description: row.description ?? '',
        contact: row.contact ?? undefined,
        neighborhood: row.neighborhood ?? undefined,
        postedDate: row.posted_date ?? undefined,
        expiresDate: row.expires_date ?? undefined,
        url: row.url ?? undefined,
        flaggedCount: row.flagged_count,
        hidden: row.hidden,
        order: row.sort_order,
      }))
    },

    async fetchClassroomTeachers(scope, fetchOptions): Promise<ClassroomTeacher[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('classroom_teachers')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as ClassroomTeacherRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        grade: row.grade,
        subject: row.subject ?? undefined,
        email: row.email ?? undefined,
        photo: row.photo_url ?? undefined,
        bio: row.bio_md ?? undefined,
        wishlist: (row.wishlist as Array<Record<string, unknown>>) ?? [],
        readingList: (row.reading_list as Array<Record<string, unknown>>) ?? [],
        order: row.sort_order,
      }))
    },

    async fetchBudgetYears(scope, fetchOptions): Promise<BudgetYear[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('budget_years')
        .select('*')
        .eq('school_id', school.id)
        .order('year', { ascending: false })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as BudgetYearRow[]).map((row) => ({
        slug: row.slug,
        year: row.year,
        totalRaised: Number(row.total_raised),
        totalSpent: Number(row.total_spent),
        categories: (row.categories as unknown as BudgetLineItem[]) ?? [],
        summary: row.summary ?? undefined,
        order: row.sort_order,
      }))
    },

    async fetchCommittees(scope, fetchOptions): Promise<Committee[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('committees')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as CommitteeRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        icon: row.icon ?? undefined,
        description: row.description_md ?? undefined,
        meets: row.meets ?? undefined,
        members: (row.members as Array<Record<string, unknown>>) ?? [],
        order: row.sort_order,
      }))
    },

    async fetchPrograms(scope, fetchOptions): Promise<Program[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('programs')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as ProgramRow[]).map((row) => ({
        slug: row.slug,
        name: row.name,
        grades: row.grades ?? undefined,
        schedule: row.schedule ?? undefined,
        description: row.description_md ?? undefined,
        funding: row.funding ?? undefined,
        partner: row.partner ?? undefined,
        goalCents: row.goal_cents ?? undefined,
        raisedCents: row.raised_cents,
        order: row.sort_order,
      }))
    },

    async fetchPtaNewsletters(scope, fetchOptions): Promise<PtaNewsletter[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('pta_newsletters')
        .select('*')
        .eq('school_id', school.id)
        .order('published_at', { ascending: false })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as PtaNewsletterRow[]).map((row) => ({
        slug: row.slug,
        title: row.title,
        pdfUrl: row.pdf_url ?? undefined,
        publishedAt: row.published_at,
      }))
    },

    async fetchSpiritStoreProducts(scope, fetchOptions): Promise<SpiritStoreProduct[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('spirit_store_products')
        .select('*')
        .eq('school_id', school.id)
        .eq('active', true)
        .order('sort_order', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        slug: row.slug as string,
        name: row.name as string,
        description: (row.description as string) ?? undefined,
        priceCents: row.price_cents as number,
        imageUrl: (row.image_url as string) ?? undefined,
        category: (row.category as string) ?? undefined,
        variants: (row.variants as Array<{ label: string }>) ?? [],
        maxQuantity: (row.max_quantity as number) ?? undefined,
        order: row.sort_order as number,
      }))
    },

    async fetchDirectory(scope, fetchOptions): Promise<DirectoryEntry[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('directory_entries')
        .select('family_name, parent_names, student_grades, email, phone, neighborhood, notes')
        .eq('school_id', school.id)
        .eq('visible', true)
        .order('family_name', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        familyName: row.family_name as string,
        parentNames: (row.parent_names as string[]) ?? [],
        studentGrades: (row.student_grades as string[]) ?? [],
        email: (row.email as string) ?? undefined,
        phone: (row.phone as string) ?? undefined,
        neighborhood: (row.neighborhood as string) ?? undefined,
        notes: (row.notes as string) ?? undefined,
      }))
    },

    async fetchForms(scope, fetchOptions): Promise<SchoolForm[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('forms')
        .select('slug, title, description, fields, target_grades, target_classrooms, published, due_date')
        .eq('school_id', school.id)
        .eq('published', true)
        .order('due_date', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return (data ?? []).map((row: Record<string, unknown>) => ({
        slug: row.slug as string,
        title: row.title as string,
        description: (row.description as string) ?? undefined,
        fields: (row.fields as FormFieldDefinition[]) ?? [],
        targetGrades: (row.target_grades as string[]) ?? [],
        targetClassrooms: (row.target_classrooms as string[]) ?? [],
        dueDate: (row.due_date as string) ?? undefined,
        published: row.published as boolean,
      }))
    },

    async fetchConferenceWindows(scope, fetchOptions): Promise<ConferenceWindow[]> {
      const school = await resolveSchool(scope)
      const query = client
        .from('conference_windows')
        .select('slug, title, description, starts_on, ends_on')
        .eq('school_id', school.id)
        .eq('published', true)
        .order('starts_on', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return (data ?? []).map((row: Record<string, unknown>) => ({
        slug: row.slug as string,
        title: row.title as string,
        description: (row.description as string) ?? undefined,
        startsOn: row.starts_on as string,
        endsOn: row.ends_on as string,
      }))
    },

    async fetchConferenceSlots(windowSlug, scope, fetchOptions): Promise<ConferenceSlot[]> {
      const school = await resolveSchool(scope)

      // Resolve window slug → id
      const { data: window } = await client
        .from('conference_windows')
        .select('id')
        .eq('school_id', school.id)
        .eq('slug', windowSlug)
        .eq('published', true)
        .maybeSingle()

      if (!window) return []

      const query = client
        .from('conference_slots')
        .select('id, window_id, teacher_name, date, start_time, end_time, duration_minutes, location, booked_by')
        .eq('window_id', window.id)
        .eq('school_id', school.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      const { data, error } = await (fetchOptions?.signal
        ? query.abortSignal(fetchOptions.signal)
        : query)
      if (error) throw error
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        windowId: row.window_id as string,
        teacherName: row.teacher_name as string,
        date: row.date as string,
        startTime: row.start_time as string,
        endTime: row.end_time as string,
        durationMinutes: row.duration_minutes as number,
        location: (row.location as string) ?? undefined,
        isBooked: row.booked_by != null,
      }))
    },
  }
}

async function loadCounts(
  client: SupabaseClient<Database>,
  schoolId: string,
  _options?: FetchOptions,
): Promise<{
  events: number
  news: number
  board: number
  volunteers: number
  resources: number
}> {
  const tables = ['events', 'news', 'board_members', 'volunteer_roles', 'resources'] as const
  const results = await Promise.all(
    tables.map((t) =>
      client.from(t).select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
    ),
  )
  const [events, news, board, volunteers, resources] = results.map((r) => r.count ?? 0)
  return { events, news, board, volunteers, resources }
}
