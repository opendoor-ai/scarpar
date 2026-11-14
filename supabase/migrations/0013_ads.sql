-- 0013: 배너 광고 · 유료 상단 노출 · 배너 노출/클릭 통계
-- - 관리: 플랫폼 관리자(전자동)만 — 서버에서 관리자 확인 후 service role로 저장
-- - 표시: 쇼핑몰 화면은 서버가 service role로 "지금 진행 중인 광고"만 읽어서 보여줌
-- 여러 번 실행해도 안전합니다.

-- 배너 광고 -----------------------------------------------------------------
create table if not exists public.banner_ads (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,                         -- 관리용 이름 (이미지 대체 글자로도 사용)
  advertiser_org_id   uuid references public.orgs (id) on delete set null,  -- 광고주 공급사 (없으면 직접 입력 이름)
  advertiser_name     text,
  link_url            text not null,                         -- 누르면 갈 주소 (/s/... 또는 https://...)
  image_pc            text not null,                         -- PC 이미지 (미디어 경로 또는 https 주소)
  image_mobile        text,                                  -- 모바일 이미지 (없으면 PC 이미지 사용)
  placement           text not null check (placement in ('main', 'category')),  -- main: 전체 제품 첫 화면, category: 카테고리 페이지
  category_id         uuid references public.categories (id) on delete set null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  sort_order          int not null default 0,                -- 같은 자리에서 보여주는 순서
  is_active           boolean not null default true,         -- 수동으로 멈추기
  payment_status      text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'free')),
  price_won           bigint,                                -- 계약 금액 (원)
  memo                text,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint banner_ads_period_check check (ends_at > starts_at),
  constraint banner_ads_category_check check (placement <> 'category' or category_id is not null)
);
create index if not exists banner_ads_live_idx on public.banner_ads (placement, category_id, starts_at, ends_at);

-- 유료 상단 노출 ------------------------------------------------------------
create table if not exists public.product_promotions (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  org_id          uuid not null references public.orgs (id) on delete cascade,  -- 상품의 공급사
  placement       text not null check (placement in ('main', 'category')),     -- main: 전체 제품 첫 화면, category: 그 상품의 카테고리 페이지
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  is_active       boolean not null default true,
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'free')),
  price_won       bigint,
  memo            text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint product_promotions_period_check check (ends_at > starts_at)
);
create index if not exists product_promotions_live_idx on public.product_promotions (placement, starts_at, ends_at);
create index if not exists product_promotions_product_idx on public.product_promotions (product_id);

-- 배너 노출·클릭 기록 ---------------------------------------------------------
create table if not exists public.banner_events (
  id            bigint generated always as identity primary key,
  banner_id     uuid not null references public.banner_ads (id) on delete cascade,
  event_type    text not null check (event_type in ('impression', 'click')),
  visitor_hash  text,
  created_at    timestamptz not null default now()
);
create index if not exists banner_events_banner_time_idx on public.banner_events (banner_id, event_type, created_at desc);
create index if not exists banner_events_dedupe_idx on public.banner_events (banner_id, event_type, visitor_hash, created_at desc);

-- 보안: 플랫폼 관리자만 직접 읽기 (쓰기는 서버의 service role만)
alter table public.banner_ads enable row level security;
alter table public.product_promotions enable row level security;
alter table public.banner_events enable row level security;

drop policy if exists banner_ads_admin_select on public.banner_ads;
create policy banner_ads_admin_select on public.banner_ads for select to authenticated using (public.is_platform_admin());
drop policy if exists product_promotions_admin_select on public.product_promotions;
create policy product_promotions_admin_select on public.product_promotions for select to authenticated using (public.is_platform_admin());
drop policy if exists banner_events_admin_select on public.banner_events;
create policy banner_events_admin_select on public.banner_events for select to authenticated using (public.is_platform_admin());

grant select on public.banner_ads, public.product_promotions, public.banner_events to authenticated;
grant all on public.banner_ads, public.product_promotions, public.banner_events to service_role;

-- 배너별 노출·클릭 합계 (기간)
create or replace function public.banner_event_summary(p_from timestamptz, p_to timestamptz)
returns table (banner_id uuid, impressions bigint, clicks bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select e.banner_id,
         count(*) filter (where e.event_type = 'impression'),
         count(*) filter (where e.event_type = 'click')
  from public.banner_events e
  where e.created_at >= p_from and e.created_at < p_to
  group by e.banner_id;
$$;
grant execute on function public.banner_event_summary(timestamptz, timestamptz) to authenticated;

-- 확인용
select (select count(*) from public.banner_ads) as 배너_수, (select count(*) from public.product_promotions) as 상단노출_수;
