-- 0002_commerce.sql — 전자동기계광고 commerce module (docs/architecture.md §3)
-- Depends on 0001_core.sql: orgs, media, auth.users, and helper fns
-- user_org_ids(), is_org_member(org_id), has_org_role(org_id, roles), next_doc_number(...).
-- Do not recreate any of the above here.

begin;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- categories --------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  name text not null,
  slug text not null,
  parent_id uuid references categories (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_org_slug_key unique (org_id, slug)
);

-- products ------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  brand text,
  category_id uuid references categories (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  price bigint not null default 0,
  compare_at_price bigint,
  cost_price bigint,
  sku text,
  barcode text,
  hs_code text,
  track_stock boolean not null default true,
  stock_qty int not null default 0,
  low_stock_threshold int not null default 5,
  allow_backorder boolean not null default false,
  weight_grams int,
  tags text[],
  attributes jsonb not null default '{}'::jsonb,
  seo jsonb,
  is_featured boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_org_slug_key unique (org_id, slug)
);

-- product_variants ------------------------------------------------------------
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  sku text,
  price bigint not null,
  compare_at_price bigint,
  stock_qty int not null default 0,
  options jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- product_images --------------------------------------------------------------
create table product_images (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete set null,
  media_id uuid not null references media (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- inventory_movements -----------------------------------------------------
-- stock_qty on product/variant is denormalized; every stock change writes a
-- movement row in the same action (app-layer responsibility).
create table inventory_movements (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete set null,
  qty_delta int not null,
  type text not null check (type in ('purchase', 'sale', 'adjustment', 'return', 'release')),
  reference text,
  note text,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- customers -------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  notes text,
  tags text[],
  total_spent bigint not null default 0,
  orders_count int not null default 0,
  last_order_at timestamptz,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint customers_org_phone_key unique (org_id, phone)
);

-- customer_addresses ------------------------------------------------------
create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  label text,
  recipient text not null,
  phone text not null,
  line1 text not null,
  area text,
  district text not null,
  postcode text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- discounts -----------------------------------------------------------------
create table discounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  code text, -- null = auto-apply
  title text not null,
  type text not null check (type in ('percent', 'fixed', 'free_shipping')),
  value bigint,
  scope text not null default 'all' check (scope in ('all', 'products', 'categories')),
  product_ids uuid[],
  category_ids uuid[],
  min_order bigint not null default 0,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discounts_org_code_key unique (org_id, code)
);

-- orders ------------------------------------------------------------------
-- cod_amount = total - advance_paid, computed in app + stored on the 0003 delivery row.
create table orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  order_no text not null,
  channel text not null default 'manual' check (channel in ('storefront', 'pos', 'manual')),
  customer_id uuid references customers (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address jsonb,
  delivery_zone_id uuid, -- fk added in 0003 once delivery_zones exists
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'completed', 'cancelled', 'returned', 'failed')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'advance_paid', 'paid', 'refunded', 'partial_refund')
  ),
  subtotal bigint not null,
  discount_amount bigint not null default 0,
  discount_code text,
  delivery_charge bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint not null,
  advance_due bigint not null default 0,
  advance_paid bigint not null default 0,
  payment_method text not null default 'cod' check (
  ),
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  risk_note text,
  tags text[],
  note_internal text,
  note_customer text,
  source_meta jsonb,
  placed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint orders_org_order_no_key unique (org_id, order_no)
);

-- order_items (snapshot) ---------------------------------------------------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  variant_id uuid references product_variants (id) on delete set null,
  product_name text not null,
  variant_name text,
  sku text,
  image_path text,
  unit_price bigint not null,
  qty int not null,
  line_total bigint not null,
  created_at timestamptz not null default now()
);

-- order_events (timeline) --------------------------------------------------
create table order_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  type text not null check (type in ('status', 'payment', 'delivery', 'note', 'system')),
  message text,
  data jsonb,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- payments ------------------------------------------------------------------
-- CHOKEPOINT RULE: only the verifyPayment() server action flips status -> 'verified'
-- and updates orders.payment_status / orders.advance_paid. Webhooks + manual verify
-- both route through it. Never trust client-supplied amounts.
create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  method text not null check (
  ),
  kind text not null check (kind in ('advance', 'full', 'balance', 'refund')),
  amount bigint not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'refunded')),
  provider_ref text,
  sender_number text,
  screenshot_media_id uuid references media (id) on delete set null,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- returns -------------------------------------------------------------------
create table returns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  return_no text not null,
  status text not null default 'requested' check (
    status in ('requested', 'approved', 'rejected', 'received', 'refunded')
  ),
  reason text,
  resolution text check (resolution in ('refund', 'store_credit', 'exchange')),
  refund_amount bigint,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint returns_org_return_no_key unique (org_id, return_no)
);

-- return_items --------------------------------------------------------------
create table return_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  return_id uuid not null references returns (id) on delete cascade,
  order_item_id uuid not null references order_items (id),
  qty int not null,
  condition text,
  created_at timestamptz not null default now()
);

-- reviews ---------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  order_id uuid references orders (id) on delete set null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- blocklist -----------------------------------------------------------------
create table blocklist (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs (id) on delete cascade,
  kind text not null check (kind in ('phone', 'address', 'ip')),
  value text not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocklist_org_kind_value_key unique (org_id, kind, value)
);

-- ============================================================================
-- TRIGGERS — updated_at auto-touch (only tables that carry updated_at)
-- ============================================================================

create trigger products_touch_updated_at
before update on products
for each row execute function touch_updated_at();

create trigger orders_touch_updated_at
before update on orders
for each row execute function touch_updated_at();

create trigger returns_touch_updated_at
before update on returns
for each row execute function touch_updated_at();

-- ============================================================================
-- INDEXES — org_id everywhere (via unique constraint above, or explicitly here)
-- ============================================================================

create index product_variants_org_idx on product_variants (org_id);
create index product_images_org_idx on product_images (org_id);
create index customer_addresses_org_idx on customer_addresses (org_id);
create index order_items_org_idx on order_items (org_id);
create index order_events_org_idx on order_events (org_id);
create index return_items_org_idx on return_items (org_id);

create index products_org_status_idx on products (org_id, status);

create index orders_org_status_idx on orders (org_id, status);
create index orders_org_placed_at_idx on orders (org_id, placed_at desc);
create index orders_org_customer_phone_idx on orders (org_id, customer_phone);

create index order_items_order_id_idx on order_items (order_id);
create index order_events_order_id_idx on order_events (order_id);

create index payments_order_id_idx on payments (order_id);
create index payments_org_status_idx on payments (org_id, status);

create index reviews_org_status_idx on reviews (org_id, status);
create index reviews_product_id_idx on reviews (product_id);

create index inventory_movements_org_product_created_idx
  on inventory_movements (org_id, product_id, created_at desc);

-- ============================================================================
-- RLS — enable on every table
-- ============================================================================

alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table inventory_movements enable row level security;
alter table customers enable row level security;
alter table customer_addresses enable row level security;
alter table discounts enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;
alter table payments enable row level security;
alter table returns enable row level security;
alter table return_items enable row level security;
alter table reviews enable row level security;
alter table blocklist enable row level security;

-- ============================================================================
-- RLS — member SELECT (every table, any org member) + role-gated writes
-- ============================================================================

-- admin-tier (owner|admin|manager): categories, products, product_variants,
-- product_images, discounts, reviews (moderation), blocklist

create policy categories_select_members on categories
  for select to authenticated using (is_org_member(org_id));
create policy categories_write_admin on categories
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

create policy products_select_members on products
  for select to authenticated using (is_org_member(org_id));
create policy products_write_admin on products
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

create policy product_variants_select_members on product_variants
  for select to authenticated using (is_org_member(org_id));
create policy product_variants_write_admin on product_variants
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

create policy product_images_select_members on product_images
  for select to authenticated using (is_org_member(org_id));
create policy product_images_write_admin on product_images
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

create policy discounts_select_members on discounts
  for select to authenticated using (is_org_member(org_id));
create policy discounts_write_admin on discounts
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

create policy reviews_select_members on reviews
  for select to authenticated using (is_org_member(org_id));
create policy reviews_write_admin on reviews
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

create policy blocklist_select_members on blocklist
  for select to authenticated using (is_org_member(org_id));
create policy blocklist_write_admin on blocklist
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager']::text[]));

-- staff-tier (owner|admin|manager|staff): inventory_movements, customers,
-- customer_addresses, orders, order_items, order_events, payments, returns, return_items

create policy inventory_movements_select_members on inventory_movements
  for select to authenticated using (is_org_member(org_id));
create policy inventory_movements_write_staff on inventory_movements
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy customers_select_members on customers
  for select to authenticated using (is_org_member(org_id));
create policy customers_write_staff on customers
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy customer_addresses_select_members on customer_addresses
  for select to authenticated using (is_org_member(org_id));
create policy customer_addresses_write_staff on customer_addresses
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy orders_select_members on orders
  for select to authenticated using (is_org_member(org_id));
create policy orders_write_staff on orders
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy order_items_select_members on order_items
  for select to authenticated using (is_org_member(org_id));
create policy order_items_write_staff on order_items
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy order_events_select_members on order_events
  for select to authenticated using (is_org_member(org_id));
create policy order_events_write_staff on order_events
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy payments_select_members on payments
  for select to authenticated using (is_org_member(org_id));
create policy payments_write_staff on payments
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy returns_select_members on returns
  for select to authenticated using (is_org_member(org_id));
create policy returns_write_staff on returns
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

create policy return_items_select_members on return_items
  for select to authenticated using (is_org_member(org_id));
create policy return_items_write_staff on return_items
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

-- ============================================================================
-- RLS — public (anon) storefront reads. No anon access to anything else;
-- storefront order placement goes through a service-role server action.
-- ============================================================================

create policy products_public_select on products
  for select to anon
  using (status = 'active');

create policy product_variants_public_select on product_variants
  for select to anon
  using (
    exists (
      select 1 from products p
      where p.id = product_variants.product_id and p.status = 'active'
    )
  );

create policy product_images_public_select on product_images
  for select to anon
  using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id and p.status = 'active'
    )
  );

create policy categories_public_select on categories
  for select to anon
  using (
    exists (
      select 1 from orgs o
      where o.id = categories.org_id and o.is_active = true
    )
  );

create policy reviews_public_select on reviews
  for select to anon
  using (status = 'published');

commit;
