/**
 * Generated Supabase database types.
 *
 * This file is a PLACEHOLDER until the migrations in `supabase/migrations/`
 * are applied and `supabase gen types typescript` is run. The shape below
 * is hand-kept in sync with the SQL in `supabase/migrations/` so that
 * downstream packages (`@schoolyard/content-api`, `apps/web`, `apps/mobile`)
 * can typecheck before the real generation step.
 *
 * When the live Supabase project exists, regenerate with:
 *
 *   pnpm supabase gen types typescript \
 *     --project-id <ref> \
 *     --schema public > packages/supabase/src/database.types.ts
 *
 * Keep the `Database` export shape identical so consumers don't break.
 */

export interface Database {
  public: {
    Tables: {
      districts: {
        Row: DistrictRow
        Insert: Omit<DistrictRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<DistrictRow>
      }
      schools: {
        Row: SchoolRow
        Insert: Omit<SchoolRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<SchoolRow>
      }
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at'> & { created_at?: string }
        Update: Partial<ProfileRow>
      }
      events: {
        Row: EventRow
        Insert: ContentInsert<EventRow>
        Update: Partial<EventRow>
      }
      news: {
        Row: NewsRow
        Insert: ContentInsert<NewsRow>
        Update: Partial<NewsRow>
      }
      board_members: {
        Row: BoardMemberRow
        Insert: ContentInsert<BoardMemberRow>
        Update: Partial<BoardMemberRow>
      }
      volunteer_roles: {
        Row: VolunteerRoleRow
        Insert: ContentInsert<VolunteerRoleRow>
        Update: Partial<VolunteerRoleRow>
      }
      resources: {
        Row: ResourceRow
        Insert: ContentInsert<ResourceRow>
        Update: Partial<ResourceRow>
      }
      lunch_menus: {
        Row: LunchMenuRow
        Insert: ContentInsert<LunchMenuRow>
        Update: Partial<LunchMenuRow>
      }
      transportation_routes: {
        Row: TransportationRouteRow
        Insert: ContentInsert<TransportationRouteRow>
        Update: Partial<TransportationRouteRow>
      }
      community_listings: {
        Row: CommunityListingRow
        Insert: ContentInsert<CommunityListingRow>
        Update: Partial<CommunityListingRow>
      }
      classroom_teachers: {
        Row: ClassroomTeacherRow
        Insert: ContentInsert<ClassroomTeacherRow>
        Update: Partial<ClassroomTeacherRow>
      }
      budget_years: {
        Row: BudgetYearRow
        Insert: ContentInsert<BudgetYearRow>
        Update: Partial<BudgetYearRow>
      }
      committees: {
        Row: CommitteeRow
        Insert: ContentInsert<CommitteeRow>
        Update: Partial<CommitteeRow>
      }
      programs: {
        Row: ProgramRow
        Insert: ContentInsert<ProgramRow>
        Update: Partial<ProgramRow>
      }
      pta_newsletters: {
        Row: PtaNewsletterRow
        Insert: ContentInsert<PtaNewsletterRow>
        Update: Partial<PtaNewsletterRow>
      }
      event_rsvps: {
        Row: EventRsvpRow
        Insert: Omit<EventRsvpRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<EventRsvpRow>
      }
      fundraising_donations: {
        Row: FundraisingDonationRow
        Insert: Omit<FundraisingDonationRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<FundraisingDonationRow>
      }
      contact_submissions: {
        Row: ContactSubmissionRow
        Insert: Omit<ContactSubmissionRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<ContactSubmissionRow>
      }
      volunteer_hours: {
        Row: VolunteerHourRow
        Insert: Omit<VolunteerHourRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<VolunteerHourRow>
      }
      community_flags: {
        Row: CommunityFlagRow
        Insert: Omit<CommunityFlagRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<CommunityFlagRow>
      }
      push_tokens: {
        Row: PushTokenRow
        Insert: Omit<PushTokenRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<PushTokenRow>
      }
      announcements: {
        Row: AnnouncementRow
        Insert: Omit<AnnouncementRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<AnnouncementRow>
      }
    }
    Views: {
      fundraising_program_totals: {
        Row: {
          program_id: string | null
          school_id: string
          raised_cents: number
        }
      }
    }
    Functions: {
      current_school_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      increment_listing_flag: {
        Args: { p_listing: string }
        Returns: null
      }
      event_capacity_remaining: {
        Args: { p_event: string }
        Returns: number
      }
    }
    Enums: Record<string, never>
  }
}

// ── Row shapes ────────────────────────────────────────────────────────

type ContentInsert<T extends { id: string; created_at: string; updated_at: string }> = Omit<
  T,
  'id' | 'created_at' | 'updated_at'
> & { id?: string; created_at?: string; updated_at?: string }

export interface DistrictRow {
  id: string
  slug: string
  name: string
  created_at: string
  settings: Record<string, unknown>
}

export interface SchoolRow {
  id: string
  district_id: string | null
  slug: string
  name: string
  short_name: string | null
  domain: string | null
  path_slug: string | null
  branding: Record<string, unknown>
  languages: Record<string, unknown>
  modules: Record<string, unknown>
  backend: 'static' | 'supabase'
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  display_name: string | null
  school_id: string | null
  district_id: string | null
  role: 'member' | 'editor' | 'admin' | 'district_admin'
  created_at: string
}

interface ContentBase {
  id: string
  school_id: string
  slug: string
  created_at: string
  updated_at: string
}

export interface EventRow extends ContentBase {
  title: string
  description: string | null
  body_md: string | null
  body_html: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  category: string | null
  capacity: number | null
  rsvp_enabled: boolean
  published: boolean
  featured: boolean
  cancelled: boolean
}

export interface NewsRow extends ContentBase {
  title: string
  excerpt: string | null
  body_md: string | null
  body_html: string | null
  author: string | null
  tags: string[]
  published_at: string
  published: boolean
  featured: boolean
  image: string | null
  image_alt: string | null
}

export interface BoardMemberRow extends ContentBase {
  name: string
  role: string
  bio_md: string | null
  bio_html: string | null
  email: string | null
  photo_url: string | null
  term_start: string | null
  term_end: string | null
  sort_order: number
}

export interface VolunteerRoleRow extends ContentBase {
  title: string
  description_md: string | null
  description_html: string | null
  commitment: string | null
  capacity: number | null
  filled: number
  contact_email: string | null
  sort_order: number
}

export interface ResourceRow extends ContentBase {
  name: string
  category: string
  description: string | null
  address: string | null
  phone: string | null
  url: string | null
  languages: string[]
}

export interface LunchMenuRow extends ContentBase {
  week_of: string
  week_end: string | null
  meals: Record<string, unknown>
  allergens: string[]
  free_reduced_note: string | null
  pdf_url: string | null
}

export interface TransportationRouteRow extends ContentBase {
  route_number: string
  route_name: string
  driver: string | null
  morning_arrival: string | null
  afternoon_departure: string | null
  stops: Array<Record<string, unknown>>
  notes: string | null
  sort_order: number
}

export interface CommunityListingRow extends ContentBase {
  title: string
  category: string
  description: string | null
  contact: string | null
  neighborhood: string | null
  posted_date: string | null
  expires_date: string | null
  url: string | null
  created_by: string | null
  flagged_count: number
  hidden: boolean
  sort_order: number
}

export interface ClassroomTeacherRow extends ContentBase {
  name: string
  grade: string
  subject: string | null
  email: string | null
  photo_url: string | null
  bio_md: string | null
  wishlist: Array<Record<string, unknown>>
  reading_list: Array<Record<string, unknown>>
  sort_order: number
}

export interface BudgetYearRow extends ContentBase {
  year: number
  total_raised: number
  total_spent: number
  categories: Array<Record<string, unknown>>
  summary: string | null
  sort_order: number
}

export interface CommitteeRow extends ContentBase {
  name: string
  icon: string | null
  description_md: string | null
  meets: string | null
  members: Array<Record<string, unknown>>
  sort_order: number
}

export interface ProgramRow extends ContentBase {
  name: string
  grades: string | null
  schedule: string | null
  description_md: string | null
  funding: string | null
  partner: string | null
  goal_cents: number | null
  raised_cents: number
  sort_order: number
}

export interface PtaNewsletterRow extends ContentBase {
  title: string
  pdf_url: string | null
  published_at: string
}

export interface EventRsvpRow {
  id: string
  event_id: string
  school_id: string
  user_id: string
  guests: number
  status: 'going' | 'maybe' | 'canceled'
  created_at: string
}

export interface FundraisingDonationRow {
  id: string
  school_id: string
  program_id: string | null
  amount_cents: number
  donor_name: string | null
  donor_email: string | null
  stripe_payment_intent: string | null
  created_at: string
}

export interface ContactSubmissionRow {
  id: string
  school_id: string
  name: string
  email: string
  subject: string | null
  message: string
  honeypot: string | null
  ip_hash: string | null
  created_at: string
}

export interface VolunteerHourRow {
  id: string
  school_id: string
  user_id: string
  role_id: string | null
  hours: number
  served_on: string
  notes: string | null
  created_at: string
}

export interface CommunityFlagRow {
  id: string
  listing_id: string
  school_id: string
  reporter_id: string | null
  reason: string
  resolved: boolean
  created_at: string
}

export interface PushTokenRow {
  id: string
  user_id: string | null
  school_id: string
  expo_token: string
  platform: 'ios' | 'android'
  created_at: string
}

export interface AnnouncementRow {
  id: string
  school_id: string
  title: string
  body: string
  sent_at: string | null
  created_by: string | null
  created_at: string
}
