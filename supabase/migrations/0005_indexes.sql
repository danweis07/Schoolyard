-- 0005_indexes.sql
-- Compound indexes for the hot read paths. Each content query is scoped
-- to a single school_id; the compound prefix means the planner can satisfy
-- `where school_id = $1 order by <col> desc limit N` with a single index
-- range scan.

create index if not exists events_school_starts_at_idx
  on public.events (school_id, starts_at desc)
  where published = true;

create index if not exists news_school_published_at_idx
  on public.news (school_id, published_at desc)
  where published = true;

create index if not exists board_members_school_order_idx
  on public.board_members (school_id, sort_order asc);

create index if not exists volunteer_roles_school_order_idx
  on public.volunteer_roles (school_id, sort_order asc);

create index if not exists resources_school_category_idx
  on public.resources (school_id, category);

create index if not exists lunch_menus_school_week_idx
  on public.lunch_menus (school_id, week_of desc);

create index if not exists transportation_routes_school_order_idx
  on public.transportation_routes (school_id, sort_order asc);

create index if not exists community_listings_school_category_idx
  on public.community_listings (school_id, category)
  where hidden = false;

create index if not exists classroom_teachers_school_grade_idx
  on public.classroom_teachers (school_id, grade, sort_order asc);

create index if not exists budget_years_school_year_idx
  on public.budget_years (school_id, year desc);

create index if not exists committees_school_order_idx
  on public.committees (school_id, sort_order asc);

create index if not exists programs_school_order_idx
  on public.programs (school_id, sort_order asc);

create index if not exists pta_newsletters_school_published_at_idx
  on public.pta_newsletters (school_id, published_at desc);

-- Dynamic
create index if not exists event_rsvps_event_idx
  on public.event_rsvps (event_id);

create index if not exists event_rsvps_user_idx
  on public.event_rsvps (user_id);

create index if not exists fundraising_donations_school_created_idx
  on public.fundraising_donations (school_id, created_at desc);

create index if not exists fundraising_donations_program_idx
  on public.fundraising_donations (program_id)
  where program_id is not null;

create index if not exists volunteer_hours_user_served_idx
  on public.volunteer_hours (user_id, served_on desc);

create index if not exists community_flags_listing_idx
  on public.community_flags (listing_id);

create index if not exists push_tokens_school_idx
  on public.push_tokens (school_id);

create index if not exists announcements_school_sent_idx
  on public.announcements (school_id, sent_at desc)
  where sent_at is not null;

-- Schools lookup indexes for middleware-level resolution
create index if not exists schools_domain_idx on public.schools (domain) where domain is not null;
create index if not exists schools_path_slug_idx on public.schools (path_slug) where path_slug is not null;
