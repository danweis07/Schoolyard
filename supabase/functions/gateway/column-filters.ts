/**
 * Per-table column allowlists for public (unauthenticated) responses.
 *
 * Tables not listed here return all columns publicly.
 * PII fields (emails, contact info, staff names, user IDs) are stripped
 * from public responses but included in admin responses after role verification.
 */

/** Columns to SELECT for public content reads. */
export const PUBLIC_SELECT: Record<string, string> = {
  events:
    'slug, title, description, body_html, starts_at, ends_at, location, category, capacity, rsvp_enabled, featured, cancelled, target_grades, target_classrooms',

  news: 'slug, title, excerpt, body_html, author, tags, image, image_alt, published_at, featured',

  // email excluded — PII
  board_members: 'slug, name, role, photo_url, bio_html, term_start, term_end, sort_order',

  // contact_email excluded — PII
  volunteer_roles: 'slug, title, description_html, commitment, capacity, filled, sort_order',

  resources: 'slug, name, category, description, address, phone, url, languages',

  lunch_menus: 'slug, week_of, week_end, meals, allergens, free_reduced_note, pdf_url',

  // driver excluded — PII (staff name)
  transportation_routes:
    'slug, route_number, route_name, morning_arrival, afternoon_departure, stops, notes, sort_order',

  // contact, created_by, flagged_count excluded — PII / moderation
  community_listings:
    'slug, title, category, description, neighborhood, posted_date, expires_date, url, sort_order',

  // email excluded — PII
  classroom_teachers:
    'slug, name, grade, subject, photo_url, bio_md, wishlist, reading_list, sort_order',

  budget_years: 'slug, year, total_raised, total_spent, categories, summary, sort_order',

  committees: 'slug, name, icon, description_md, meets, members, sort_order',

  programs:
    'slug, name, grades, schedule, description_md, funding, partner, goal_cents, raised_cents, sort_order',

  pta_newsletters: 'slug, title, pdf_url, published_at',

  // created_by excluded — internal
  announcements: 'title, body, sent_at',

  // created_by excluded — PII
  forms:
    'slug, title, description, fields, target_grades, target_classrooms, published, due_date',

  // booked_by, student_name, teacher_id excluded — PII
  conference_windows:
    'slug, title, description, starts_on, ends_on',

  conference_slots:
    'id, window_id, teacher_name, date, start_time, end_time, duration_minutes, location',

  // created_by, onesignal_notification_id excluded — internal
  notifications:
    'id, title, body_text, body_html, image_url, urgency, topic, sent_at',

  // created_by excluded — internal
  notification_templates:
    'id, slug, title, body_text, body_html, urgency, topic, locale_versions',
}

/**
 * PII field names that must NEVER appear in public /content/* responses.
 * Used by the PII audit test.
 */
export const PII_FIELDS = [
  'email',
  'contact_email',
  'driver',
  'contact',
  'created_by',
  'ip_hash',
  'donor_email',
  'donor_name',
  'user_id',
  'reporter_id',
  'expo_token',
  'stripe_payment_intent',
  'booked_by',
  'teacher_id',
] as const
