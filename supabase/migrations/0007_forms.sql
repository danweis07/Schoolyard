-- ============================================================
-- 0007_forms.sql — School-to-family forms + response tracking
-- ============================================================

-- ── forms (form definitions created by editors/admins) ───────

create table if not exists public.forms (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  slug        text not null,
  title       text not null,
  description text,

  -- JSON array of field definitions.
  -- Each element: { name, label, type, required, options?, placeholder? }
  -- type in ('text','textarea','select','checkbox','date','signature')
  fields      jsonb not null default '[]'::jsonb,

  -- Targeting: empty array means all families
  target_grades     text[] not null default '{}',
  target_classrooms text[] not null default '{}',

  -- Lifecycle
  published   boolean not null default false,
  due_date    date,
  created_by  uuid references auth.users(id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (school_id, slug)
);

create trigger tg_forms_updated_at
  before update on public.forms
  for each row execute function public.tg_touch_updated_at();

-- ── form_responses (one per form × user × student) ──────────

create table if not exists public.form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms(id) on delete cascade,
  school_id    uuid not null references public.schools(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Student name allows one parent to submit for multiple children
  student_name text,

  -- JSON object matching the form fields: { field_name: value }
  responses    jsonb not null default '{}'::jsonb,

  -- Signature stored as JSON: { typed_name, timestamp }
  signature    jsonb,

  submitted_at timestamptz not null default now(),

  unique (form_id, user_id, student_name)
);

-- ── RLS ──────────────────────────────────────────────────────

alter table public.forms enable row level security;

-- Public can read published forms
create policy "public read published forms"
  on public.forms for select
  using (published = true);

-- Editors can read all forms (including drafts) and write
create policy "editor write forms"
  on public.forms for all
  using (public.is_school_editor(school_id))
  with check (public.is_school_editor(school_id));

alter table public.form_responses enable row level security;

-- Users can read and write their own responses
create policy "self write form_responses"
  on public.form_responses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can read all responses for their school
create policy "admin read form_responses"
  on public.form_responses for select
  using (public.is_school_admin(school_id));

-- ── Indexes ──────────────────────────────────────────────────

create index if not exists forms_school_published_idx
  on public.forms (school_id, due_date desc)
  where published = true;

create index if not exists form_responses_form_idx
  on public.form_responses (form_id);

create index if not exists form_responses_user_idx
  on public.form_responses (user_id);

create index if not exists form_responses_school_idx
  on public.form_responses (school_id);
