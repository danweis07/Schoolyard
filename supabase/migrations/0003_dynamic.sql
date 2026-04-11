-- 0003_dynamic.sql
-- User-scoped and moderation tables. These are the reason we need a
-- backend at all: RSVPs, donations, contact submissions, volunteer hours,
-- community flags, push tokens, admin announcements.

-- profiles -----------------------------------------------------------
-- 1:1 with auth.users. Created automatically via the handle_new_user
-- trigger defined in 0006_functions.sql.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  school_id uuid references public.schools(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  role text not null default 'member' check (
    role in ('member', 'editor', 'admin', 'district_admin')
  ),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. role + school_id + district_id drive every RLS policy.';

-- event_rsvps --------------------------------------------------------
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  guests integer not null default 0 check (guests >= 0),
  status text not null default 'going' check (status in ('going', 'maybe', 'canceled')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- fundraising_donations ----------------------------------------------
-- Direct selects are BLOCKED by RLS. All public reads go through the
-- fundraising_program_totals view defined in 0006_functions.sql.
create table if not exists public.fundraising_donations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  donor_name text,
  donor_email text,
  stripe_payment_intent text unique,
  created_at timestamptz not null default now()
);

-- contact_submissions ------------------------------------------------
-- Honeypot is always validated on insert by an RLS policy + check
-- constraint. Admins read; anon inserts.
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  honeypot text check (honeypot is null or honeypot = ''),
  ip_hash text,
  created_at timestamptz not null default now()
);

-- volunteer_hours ----------------------------------------------------
create table if not exists public.volunteer_hours (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.volunteer_roles(id) on delete set null,
  hours numeric(5, 2) not null check (hours > 0),
  served_on date not null,
  notes text,
  created_at timestamptz not null default now()
);

-- community_flags ----------------------------------------------------
create table if not exists public.community_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.community_listings(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- push_tokens --------------------------------------------------------
-- Expo push tokens — one row per device. user_id may be null for
-- anonymous devices that opted into broadcast alerts.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  expo_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

-- announcements ------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  body text not null,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
