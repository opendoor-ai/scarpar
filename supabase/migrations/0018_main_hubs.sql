-- 0018: 메인 화면 확장 (jadong.co.kr 구성)
-- 1) 광고 자리 늘리기: 메인 배너·카테고리 + 스마트/와이드/파트너/플러스 허브, 큰 이미지 광고, 좌우 날개 배너
-- 2) 쇼츠 영상·블로그·매거진 콘텐츠
-- 3) 카테고리 아이콘 이미지
-- 4) 사이트 설정 (상단 알림 띠, 바닥글 사업자 정보)
-- 여러 번 실행해도 안전합니다.

-- 1) 광고 자리 ------------------------------------------------------------------
alter table public.banner_ads add column if not exists subtitle text;   -- 회사명·한 줄 설명 (배너 위 글자)
alter table public.banner_ads add column if not exists phone text;      -- 배너에 보여줄 전화번호

alter table public.banner_ads drop constraint if exists banner_ads_placement_check;
alter table public.banner_ads add constraint banner_ads_placement_check check (
  placement in ('main', 'category', 'smart', 'wide', 'partner', 'plus', 'image', 'wing_left', 'wing_right')
);

-- 2) 쇼츠·블로그·매거진 -----------------------------------------------------------
create table if not exists public.site_contents (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('short', 'blog', 'magazine')),
  title         text not null,
  url           text,            -- 쇼츠: 유튜브 주소 / 블로그: 블로그 글 주소 / 매거진: 비움(우리 사이트 글)
  thumbnail     text,            -- 대표 이미지 (미디어 경로 또는 https 주소, 쇼츠는 비우면 유튜브 썸네일)
  summary       text,            -- 짧은 소개
  body_html     text,            -- 매거진 본문
  product_id    uuid references public.products (id) on delete set null,  -- 함께 보여줄 제품 (블로그)
  is_published  boolean not null default true,
  sort_order    int not null default 0,
  published_at  timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists site_contents_kind_idx on public.site_contents (kind, is_published, sort_order, published_at desc);

alter table public.site_contents enable row level security;
drop policy if exists site_contents_public_select on public.site_contents;
create policy site_contents_public_select on public.site_contents
  for select to anon, authenticated using (is_published or public.is_platform_admin());
grant select on public.site_contents to anon, authenticated;
grant all on public.site_contents to service_role;

-- 3) 카테고리 아이콘 ----------------------------------------------------------------
alter table public.categories add column if not exists icon_image text;  -- 메인 화면 동그라미 아이콘 (미디어 경로)

-- 4) 사이트 설정 (한 줄짜리 표) -------------------------------------------------------
create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists site_settings_public_select on public.site_settings;
create policy site_settings_public_select on public.site_settings for select to anon, authenticated using (true);
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;

-- 확인용
select (select count(*) from public.site_contents) as 콘텐츠_수, (select count(*) from public.site_settings) as 사이트설정;
