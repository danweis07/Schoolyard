-- 0002_content.sql
-- Content tables. Each mirrors an existing Astro content collection and
-- carries both body_md (source of truth) and body_html (pre-rendered for
-- fast delivery). Every row is keyed on (school_id, slug) so upserts from
-- the migration tool are idempotent.

-- events -------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  body_md text,
  body_html text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  category text check (
    category is null or category in ('fundraiser', 'social', 'academic', 'volunteer', 'other')
  ),
  capacity integer check (capacity is null or capacity >= 0),
  rsvp_enabled boolean not null default false,
  featured boolean not null default false,
  cancelled boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.tg_touch_updated_at();

-- news ---------------------------------------------------------------
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  excerpt text,
  body_md text,
  body_html text,
  author text,
  tags text[] not null default '{}',
  image text,
  image_alt text,
  published_at timestamptz not null,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists news_touch_updated_at on public.news;
create trigger news_touch_updated_at
  before update on public.news
  for each row execute function public.tg_touch_updated_at();

-- board_members ------------------------------------------------------
create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  role text not null,
  bio_md text,
  bio_html text,
  email text,
  photo_url text,
  term_start date,
  term_end date,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists board_members_touch_updated_at on public.board_members;
create trigger board_members_touch_updated_at
  before update on public.board_members
  for each row execute function public.tg_touch_updated_at();

-- volunteer_roles ----------------------------------------------------
create table if not exists public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  description_md text,
  description_html text,
  commitment text,
  capacity integer check (capacity is null or capacity >= 0),
  filled integer not null default 0 check (filled >= 0),
  contact_email text,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists volunteer_roles_touch_updated_at on public.volunteer_roles;
create trigger volunteer_roles_touch_updated_at
  before update on public.volunteer_roles
  for each row execute function public.tg_touch_updated_at();

-- resources ----------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  category text not null check (
    category in ('food', 'health', 'housing', 'legal', 'mental-health', 'other')
  ),
  description text,
  address text,
  phone text,
  url text,
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists resources_touch_updated_at on public.resources;
create trigger resources_touch_updated_at
  before update on public.resources
  for each row execute function public.tg_touch_updated_at();

-- lunch_menus --------------------------------------------------------
create table if not exists public.lunch_menus (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  week_of date not null,
  week_end date,
  meals jsonb not null default '{}'::jsonb,
  allergens text[] not null default '{}',
  free_reduced_note text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug),
  unique (school_id, week_of)
);

drop trigger if exists lunch_menus_touch_updated_at on public.lunch_menus;
create trigger lunch_menus_touch_updated_at
  before update on public.lunch_menus
  for each row execute function public.tg_touch_updated_at();

-- transportation_routes ----------------------------------------------
create table if not exists public.transportation_routes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  route_number text not null,
  route_name text not null,
  driver text,
  morning_arrival text,
  afternoon_departure text,
  stops jsonb not null default '[]'::jsonb,
  notes text,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists transportation_routes_touch_updated_at on public.transportation_routes;
create trigger transportation_routes_touch_updated_at
  before update on public.transportation_routes
  for each row execute function public.tg_touch_updated_at();

-- community_listings -------------------------------------------------
create table if not exists public.community_listings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  category text not null check (
    category in ('classified', 'carpool', 'skill-share', 'business', 'new-family', 'other')
  ),
  description text,
  contact text,
  neighborhood text,
  posted_date date,
  expires_date date,
  url text,
  created_by uuid references auth.users(id) on delete set null,
  flagged_count integer not null default 0 check (flagged_count >= 0),
  hidden boolean not null default false,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists community_listings_touch_updated_at on public.community_listings;
create trigger community_listings_touch_updated_at
  before update on public.community_listings
  for each row execute function public.tg_touch_updated_at();

-- classroom_teachers -------------------------------------------------
create table if not exists public.classroom_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  grade text not null,
  subject text,
  email text,
  photo_url text,
  bio_md text,
  wishlist jsonb not null default '[]'::jsonb,
  reading_list jsonb not null default '[]'::jsonb,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists classroom_teachers_touch_updated_at on public.classroom_teachers;
create trigger classroom_teachers_touch_updated_at
  before update on public.classroom_teachers
  for each row execute function public.tg_touch_updated_at();

-- budget_years -------------------------------------------------------
create table if not exists public.budget_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  year integer not null,
  total_raised numeric(12, 2) not null default 0,
  total_spent numeric(12, 2) not null default 0,
  categories jsonb not null default '[]'::jsonb,
  summary text,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug),
  unique (school_id, year)
);

drop trigger if exists budget_years_touch_updated_at on public.budget_years;
create trigger budget_years_touch_updated_at
  before update on public.budget_years
  for each row execute function public.tg_touch_updated_at();

-- committees (PTA) ---------------------------------------------------
create table if not exists public.committees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text,
  description_md text,
  meets text,
  members jsonb not null default '[]'::jsonb,
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists committees_touch_updated_at on public.committees;
create trigger committees_touch_updated_at
  before update on public.committees
  for each row execute function public.tg_touch_updated_at();

-- programs (PTA enrichment) ------------------------------------------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  grades text,
  schedule text,
  description_md text,
  funding text,
  partner text,
  goal_cents integer check (goal_cents is null or goal_cents >= 0),
  raised_cents integer not null default 0 check (raised_cents >= 0),
  sort_order integer not null default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists programs_touch_updated_at on public.programs;
create trigger programs_touch_updated_at
  before update on public.programs
  for each row execute function public.tg_touch_updated_at();

-- pta_newsletters ----------------------------------------------------
create table if not exists public.pta_newsletters (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  pdf_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

drop trigger if exists pta_newsletters_touch_updated_at on public.pta_newsletters;
create trigger pta_newsletters_touch_updated_at
  before update on public.pta_newsletters
  for each row execute function public.tg_touch_updated_at();
