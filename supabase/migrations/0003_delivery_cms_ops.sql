-- 0003_delivery_cms_ops.sql
-- Delivery/COD/courier, CMS (pages/revisions/menus), expenses, and thin vertical modules
-- (courses/services/realestate). Runs after 0001_core.sql (orgs, profiles, org_members,
-- media, doc_sequences + next_doc_number, helpers user_org_ids/is_org_member/has_org_role/
-- is_platform_admin) and 0002_commerce.sql (products, customers, orders, order_items, ...).
-- See docs/architecture.md §3 (data model contract) and §4 (CMS block model).

begin;

-- =========================================================================================
-- Shared trigger fn (created in 0002; re-declared defensively so this file is self-sufficient)
-- =========================================================================================
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================================
-- delivery_zones
-- =========================================================================================
create table delivery_zones (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  name              text not null,
  districts         text[] not null default '{}'::text[],
  charge            bigint not null default 0,
  cod_available     boolean not null default true,
  advance_required  boolean not null default false,
  eta_text          text,
  is_active         boolean not null default true,
  position          int not null default 0,
  created_at        timestamptz not null default now()
);

create index delivery_zones_org_id_idx on delivery_zones(org_id);

alter table delivery_zones enable row level security;

create policy delivery_zones_select_members on delivery_zones
  for select to authenticated
  using (is_org_member(org_id));

create policy delivery_zones_write_admin on delivery_zones
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager']::text[]));

-- Deferred FK from 0002_commerce.sql: orders.delivery_zone_id was created as a bare uuid column
-- ("-- fk added in 0003 once delivery_zones exists") because delivery_zones didn't exist yet.
alter table orders
  add constraint orders_delivery_zone_id_fkey
  foreign key (delivery_zone_id) references delivery_zones(id) on delete set null;

create index orders_delivery_zone_id_idx on orders(delivery_zone_id);

-- =========================================================================================
-- riders
-- =========================================================================================
create table riders (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  name           text not null,
  phone          text not null,
  vehicle        text,
  is_active      boolean not null default true,
  cash_on_hand   bigint not null default 0,
  created_at     timestamptz not null default now()
);

create index riders_org_id_idx on riders(org_id);

alter table riders enable row level security;

create policy riders_select_members on riders
  for select to authenticated
  using (is_org_member(org_id));

create policy riders_write_staff on riders
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- cod_settlements (created before deliveries: deliveries.settlement_id references it)
-- =========================================================================================
create table cod_settlements (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  rider_id       uuid not null references riders(id) on delete restrict,
  amount         bigint not null default 0,
  delivery_ids   uuid[] not null default '{}'::uuid[],
  note           text,
  settled_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index cod_settlements_org_id_idx on cod_settlements(org_id);

alter table cod_settlements enable row level security;

create policy cod_settlements_select_members on cod_settlements
  for select to authenticated
  using (is_org_member(org_id));

create policy cod_settlements_write_staff on cod_settlements
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- deliveries
-- =========================================================================================
create table deliveries (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  order_id          uuid not null references orders(id) on delete cascade,
  delivery_no       text not null,
  method            text not null check (method in ('rider','courier','pickup')),
  rider_id          uuid references riders(id) on delete set null,
  courier           text check (courier in ('cj','hanjin','lotte','manual')),
  consignment_id    text,
  tracking_code     text,
  status            text not null default 'pending'
                       check (status in ('pending','assigned','picked_up','in_transit','delivered','failed','returned')),
  cod_amount        bigint not null default 0,
  cod_collected     boolean not null default false,
  cod_collected_at  timestamptz,
  settlement_id     uuid references cod_settlements(id) on delete set null,
  otp_code          text,
  proof_media_id    uuid references media(id) on delete set null,
  recipient_name    text,
  recipient_phone   text,
  address           jsonb,
  zone_id           uuid references delivery_zones(id) on delete set null,
  fee               bigint not null default 0,
  assigned_at       timestamptz,
  delivered_at      timestamptz,
  failed_reason     text,
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (org_id, delivery_no)
);

create index deliveries_org_id_status_idx on deliveries(org_id, status);
create index deliveries_order_id_idx on deliveries(order_id);
create index deliveries_tracking_code_idx on deliveries(tracking_code);
create index deliveries_rider_id_status_idx on deliveries(rider_id, status);

alter table deliveries enable row level security;

create policy deliveries_select_members on deliveries
  for select to authenticated
  using (is_org_member(org_id));

create policy deliveries_write_staff on deliveries
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- Rider row policies: a rider (org_members.role = 'rider') may see and update ONLY deliveries
-- assigned to their own riders row. RLS is row-level only — it cannot restrict which columns a
-- rider updates (e.g. to just status/proof_media_id/cod_collected/otp_code); the admin UI/server
-- action layer is responsible for only ever sending those fields from the rider-facing screens.
create policy deliveries_select_rider on deliveries
  for select to authenticated
  using (rider_id in (select r.id from riders r where r.user_id = auth.uid()));

create policy deliveries_update_rider on deliveries
  for update to authenticated
  using (rider_id in (select r.id from riders r where r.user_id = auth.uid()))
  with check (rider_id in (select r.id from riders r where r.user_id = auth.uid()));

create or replace trigger deliveries_touch_updated_at
  before update on deliveries
  for each row execute function touch_updated_at();

-- =========================================================================================
-- delivery_events (timeline table: identity bigint id)
-- =========================================================================================
create table delivery_events (
  id            bigint generated always as identity primary key,
  org_id        uuid not null references orgs(id) on delete cascade,
  delivery_id   uuid not null references deliveries(id) on delete cascade,
  status        text,
  note          text,
  location      text,
  actor_id      uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index delivery_events_org_id_idx on delivery_events(org_id);
create index delivery_events_delivery_id_idx on delivery_events(delivery_id);

alter table delivery_events enable row level security;

create policy delivery_events_select_members on delivery_events
  for select to authenticated
  using (is_org_member(org_id));

create policy delivery_events_write_staff on delivery_events
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- courier_accounts
-- =========================================================================================
create table courier_accounts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  courier     text not null,
  config      jsonb not null default '{}'::jsonb,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (org_id, courier)
);

alter table courier_accounts enable row level security;

create policy courier_accounts_select_members on courier_accounts
  for select to authenticated
  using (is_org_member(org_id));

create policy courier_accounts_write_admin on courier_accounts
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager']::text[]));

-- =========================================================================================
-- cms_pages
-- =========================================================================================
create table cms_pages (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  title          text not null,
  slug           text not null,
  type           text not null default 'page' check (type in ('page','home','policy')),
  blocks         jsonb not null default '[]'::jsonb,
  draft_blocks   jsonb,
  status         text not null default 'draft' check (status in ('draft','published')),
  seo            jsonb,
  published_at   timestamptz,
  updated_by     uuid references auth.users(id) on delete set null,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (org_id, slug)
);

alter table cms_pages enable row level security;

create policy cms_pages_select_members on cms_pages
  for select to authenticated
  using (is_org_member(org_id));

create policy cms_pages_write_admin on cms_pages
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager']::text[]));

-- Public: published pages. Mirrors 0002's products_public_select (status-only gate — tables
-- that carry their own status/active column do not additionally re-check orgs.is_active; that
-- extra join is reserved for tables with no status field of their own, e.g. menus below).
create policy cms_pages_anon_select_published on cms_pages
  for select to anon
  using (status = 'published');

create or replace trigger cms_pages_touch_updated_at
  before update on cms_pages
  for each row execute function touch_updated_at();

-- =========================================================================================
-- cms_revisions (timeline table: identity bigint id)
-- =========================================================================================
create table cms_revisions (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references orgs(id) on delete cascade,
  page_id     uuid not null references cms_pages(id) on delete cascade,
  blocks      jsonb not null default '[]'::jsonb,
  saved_by    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index cms_revisions_org_id_idx on cms_revisions(org_id);

alter table cms_revisions enable row level security;

create policy cms_revisions_select_members on cms_revisions
  for select to authenticated
  using (is_org_member(org_id));

create policy cms_revisions_write_admin on cms_revisions
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager']::text[]));

-- =========================================================================================
-- menus
-- =========================================================================================
create table menus (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  handle      text not null check (handle in ('header','footer')),
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (org_id, handle)
);

alter table menus enable row level security;

create policy menus_select_members on menus
  for select to authenticated
  using (is_org_member(org_id));

create policy menus_write_admin on menus
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager']::text[]));

-- Public: menus carry no status field of their own, so (matching 0002's categories_public_select)
-- gate on the org being active instead.
create policy menus_anon_select_active_org on menus
  for select to anon
  using (exists (select 1 from orgs o where o.id = menus.org_id and o.is_active = true));

-- =========================================================================================
-- expenses
-- =========================================================================================
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  category     text not null,
  amount       bigint not null default 0,
  note         text,
  spent_at     date not null default current_date,
  media_id     uuid references media(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index expenses_org_id_idx on expenses(org_id);

alter table expenses enable row level security;

create policy expenses_select_members on expenses
  for select to authenticated
  using (is_org_member(org_id));

create policy expenses_write_staff on expenses
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- courses
-- =========================================================================================
create table courses (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  title             text not null,
  slug              text not null,
  description       text,
  price             bigint not null default 0,
  cover_media_id    uuid references media(id) on delete set null,
  status            text not null default 'draft' check (status in ('draft','active','archived')),
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (org_id, slug)
);

alter table courses enable row level security;

create policy courses_select_members on courses
  for select to authenticated
  using (is_org_member(org_id));

create policy courses_write_staff on courses
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- Public: active courses (status-only gate, see cms_pages_anon_select_published note above).
create policy courses_anon_select_active on courses
  for select to anon
  using (status = 'active');

create or replace trigger courses_touch_updated_at
  before update on courses
  for each row execute function touch_updated_at();

-- =========================================================================================
-- lessons
-- =========================================================================================
create table lessons (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  title        text not null,
  content      text,
  video_url    text,
  position     int not null default 0,
  is_free      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index lessons_org_id_idx on lessons(org_id);

alter table lessons enable row level security;

create policy lessons_select_members on lessons
  for select to authenticated
  using (is_org_member(org_id));

create policy lessons_write_staff on lessons
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- Public: free lessons whose parent course is active (mirrors 0002's product_variants_public_select
-- child-of-status-bearing-parent pattern: EXISTS the parent's own status check, nothing more).
create policy lessons_anon_select_free on lessons
  for select to anon
  using (
    is_free = true
    and exists (select 1 from courses c where c.id = lessons.course_id and c.status = 'active')
  );

-- =========================================================================================
-- enrollments
-- =========================================================================================
create table enrollments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  course_id     uuid not null references courses(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,
  order_id      uuid references orders(id) on delete set null,
  status        text not null default 'active' check (status in ('active','completed','revoked')),
  progress      jsonb not null default '{}'::jsonb,
  enrolled_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index enrollments_org_id_customer_id_idx on enrollments(org_id, customer_id);

alter table enrollments enable row level security;

create policy enrollments_select_members on enrollments
  for select to authenticated
  using (is_org_member(org_id));

create policy enrollments_write_staff on enrollments
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- service_jobs
-- =========================================================================================
create table service_jobs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  job_no         text not null,
  customer_id    uuid not null references customers(id) on delete cascade,
  title          text not null,
  description    text,
  status         text not null default 'quoted'
                    check (status in ('quoted','scheduled','in_progress','done','invoiced','cancelled')),
  scheduled_at   timestamptz,
  assigned_to    uuid references auth.users(id) on delete set null,
  address        jsonb,
  quote_amount   bigint,
  final_amount   bigint,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index service_jobs_org_id_status_idx on service_jobs(org_id, status);

alter table service_jobs enable row level security;

create policy service_jobs_select_members on service_jobs
  for select to authenticated
  using (is_org_member(org_id));

create policy service_jobs_write_staff on service_jobs
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

create or replace trigger service_jobs_touch_updated_at
  before update on service_jobs
  for each row execute function touch_updated_at();

-- =========================================================================================
-- appointments
-- =========================================================================================
create table appointments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  job_id        uuid references service_jobs(id) on delete set null,
  customer_id   uuid references customers(id) on delete set null,
  title         text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  status        text not null default 'booked' check (status in ('booked','done','cancelled','no_show')),
  note          text,
  created_at    timestamptz not null default now()
);

create index appointments_org_id_idx on appointments(org_id);

alter table appointments enable row level security;

create policy appointments_select_members on appointments
  for select to authenticated
  using (is_org_member(org_id));

create policy appointments_write_staff on appointments
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- listings
-- =========================================================================================
create table listings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  title           text not null,
  slug            text not null,
  purpose         text not null check (purpose in ('sale','rent')),
  property_type   text not null check (property_type in ('apartment','house','land','commercial')),
  price           bigint not null default 0,
  area_sqft       int,
  beds            int,
  baths           int,
  address         jsonb,
  description     text,
  features        text[] not null default '{}'::text[],
  status          text not null default 'draft' check (status in ('draft','active','under_offer','sold','rented')),
  media_ids       uuid[] not null default '{}'::uuid[],
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (org_id, slug)
);

create index listings_org_id_status_idx on listings(org_id, status);

alter table listings enable row level security;

create policy listings_select_members on listings
  for select to authenticated
  using (is_org_member(org_id));

create policy listings_write_staff on listings
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- Public: active listings (status-only gate, see cms_pages_anon_select_published note above).
create policy listings_anon_select_active on listings
  for select to anon
  using (status = 'active');

create or replace trigger listings_touch_updated_at
  before update on listings
  for each row execute function touch_updated_at();

-- =========================================================================================
-- inquiries
-- =========================================================================================
create table inquiries (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  listing_id    uuid references listings(id) on delete set null,
  product_id    uuid references products(id) on delete set null,
  name          text not null,
  phone         text,
  email         text,
  message       text,
  status        text not null default 'new' check (status in ('new','contacted','closed')),
  created_at    timestamptz not null default now()
);

create index inquiries_org_id_idx on inquiries(org_id);

alter table inquiries enable row level security;

create policy inquiries_select_members on inquiries
  for select to authenticated
  using (is_org_member(org_id));

create policy inquiries_write_staff on inquiries
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin','manager','staff']::text[]))
  with check (has_org_role(org_id, array['owner','admin','manager','staff']::text[]));

-- =========================================================================================
-- get_tracking: public delivery tracking lookup (/track/[code]).
-- Deliveries carry no anon SELECT policy at all — this SECURITY DEFINER function is the ONLY
-- anon-facing read path, and it returns a fixed, limited column set (never full delivery rows).
-- =========================================================================================
create or replace function get_tracking(p_code text)
returns table (
  delivery_no     text,
  status          text,
  courier         text,
  recipient_name  text,
  eta_text        text,
  order_no        text,
  org_name        text,
  events          jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    d.delivery_no,
    d.status,
    d.courier,
    d.recipient_name,
    z.eta_text,
    o.order_no,
    org.name as org_name,
    coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('status', de.status, 'note', de.note, 'created_at', de.created_at)
                 order by de.created_at
               )
        from delivery_events de
        where de.delivery_id = d.id
      ),
      '[]'::jsonb
    ) as events
  from deliveries d
  join orders o on o.id = d.order_id
  join orgs org on org.id = d.org_id
  left join delivery_zones z on z.id = d.zone_id
  where d.tracking_code = p_code or d.delivery_no = p_code
  order by d.created_at desc
  limit 1;
end;
$$;

grant execute on function get_tracking(text) to anon;

commit;
