-- 0007_spirit_store.sql
-- Spirit Store module: product catalog, orders, and order lines.
-- Schools sell t-shirts, hoodies, car magnets — this captures orders
-- during a window and lets admins export a fulfillment CSV.

-- ── Products (editor-managed catalog) ───────────────────────────────
create table if not exists public.spirit_store_products (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents > 0),
  image_url text,
  category text,
  variants jsonb not null default '[]',
  max_quantity integer check (max_quantity is null or max_quantity > 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

comment on table public.spirit_store_products is
  'Editor-managed product catalog for school spirit stores.';
comment on column public.spirit_store_products.variants is
  'JSON array of variant options, e.g. [{"label":"S"},{"label":"M"},{"label":"L"}]';
comment on column public.spirit_store_products.max_quantity is
  'Optional stock cap — null means unlimited.';

drop trigger if exists spirit_store_products_touch_updated_at on public.spirit_store_products;
create trigger spirit_store_products_touch_updated_at
  before update on public.spirit_store_products
  for each row execute function public.tg_touch_updated_at();

-- ── Orders (parent-placed) ──────────────────────────────────────────
create table if not exists public.spirit_store_orders (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  payment_provider text,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.spirit_store_orders is
  'Parent-placed orders. Inserts via the place-spirit-order edge function.';
comment on column public.spirit_store_orders.payment_provider is
  'Which payment adapter was used: collect, stripe, square, paypal.';
comment on column public.spirit_store_orders.payment_reference is
  'External reference: Stripe PaymentIntent ID, Square order ID, etc.';

drop trigger if exists spirit_store_orders_touch_updated_at on public.spirit_store_orders;
create trigger spirit_store_orders_touch_updated_at
  before update on public.spirit_store_orders
  for each row execute function public.tg_touch_updated_at();

-- ── Order lines (items per order) ───────────────────────────────────
create table if not exists public.spirit_store_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.spirit_store_orders(id) on delete cascade,
  product_id uuid not null references public.spirit_store_products(id) on delete restrict,
  variant_label text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0),
  created_at timestamptz not null default now()
);

comment on table public.spirit_store_order_lines is
  'Line items within a spirit store order.';

-- ── Indexes ─────────────────────────────────────────────────────────
create index if not exists spirit_store_products_school_sort_idx
  on public.spirit_store_products (school_id, sort_order);

create index if not exists spirit_store_products_school_active_idx
  on public.spirit_store_products (school_id, active) where active = true;

create index if not exists spirit_store_orders_school_created_idx
  on public.spirit_store_orders (school_id, created_at desc);

create index if not exists spirit_store_orders_user_idx
  on public.spirit_store_orders (user_id, created_at desc);

create index if not exists spirit_store_order_lines_order_idx
  on public.spirit_store_order_lines (order_id);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.spirit_store_products enable row level security;
alter table public.spirit_store_orders enable row level security;
alter table public.spirit_store_order_lines enable row level security;

-- Products: public read (active only), editor write
drop policy if exists "public read spirit_store_products" on public.spirit_store_products;
create policy "public read spirit_store_products" on public.spirit_store_products
  for select using (active = true);

drop policy if exists "editor write spirit_store_products" on public.spirit_store_products;
create policy "editor write spirit_store_products" on public.spirit_store_products
  for all using (public.is_school_editor(school_id))
          with check (public.is_school_editor(school_id));

-- Orders: user reads own, admin reads all for school.
-- Inserts happen via edge function (service role), no direct client insert.
drop policy if exists "self read spirit_store_orders" on public.spirit_store_orders;
create policy "self read spirit_store_orders" on public.spirit_store_orders
  for select using (auth.uid() = user_id);

drop policy if exists "admin read spirit_store_orders" on public.spirit_store_orders;
create policy "admin read spirit_store_orders" on public.spirit_store_orders
  for select using (public.is_school_admin(school_id));

drop policy if exists "admin update spirit_store_orders" on public.spirit_store_orders;
create policy "admin update spirit_store_orders" on public.spirit_store_orders
  for update using (public.is_school_admin(school_id))
             with check (public.is_school_admin(school_id));

-- Order lines: readable if user can read the parent order.
-- Service-role inserts only (via place-spirit-order function).
drop policy if exists "self read spirit_store_order_lines" on public.spirit_store_order_lines;
create policy "self read spirit_store_order_lines" on public.spirit_store_order_lines
  for select using (
    exists (
      select 1 from public.spirit_store_orders o
       where o.id = spirit_store_order_lines.order_id
         and o.user_id = auth.uid()
    )
  );

drop policy if exists "admin read spirit_store_order_lines" on public.spirit_store_order_lines;
create policy "admin read spirit_store_order_lines" on public.spirit_store_order_lines
  for select using (
    exists (
      select 1 from public.spirit_store_orders o
       where o.id = spirit_store_order_lines.order_id
         and public.is_school_admin(o.school_id)
    )
  );
