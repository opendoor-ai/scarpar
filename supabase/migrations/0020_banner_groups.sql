-- 0020: 배너 관리 — 배너 그룹으로 사이트의 모든 배너를 한곳에서 관리
-- 1) banner_groups: 배너 그룹 (탑배너·퀵메뉴·로고·메인 슬라이드·허브 등) + 배너 코드(템플릿)
-- 2) banner_ads 확장: 그룹 연결, 텍스트 1~10, 색상 1~4, HTML, 연결 상품(최대 10), 추가이미지(최대 5), 새창/현재창, 항상 노출
-- 3) banner_group_snapshots: [배너 저장] 할 때마다 그룹별 최근 5회 기록 (시점 복구용)
-- 여러 번 실행해도 안전합니다.

-- 1) 배너 그룹 ----------------------------------------------------------------------
create table if not exists public.banner_groups (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,                 -- 그룹 이름표 (기본 그룹은 main·smart 등)
  name           text not null,                        -- 예: [메인] 슬라이드 (A타입)
  kind           text not null default 'hub' check (kind in ('common', 'main', 'hub', 'supplier')),
  guide          text,                                 -- 배너 등록 시 참고 안내
  template_html  text,                                 -- 배너 코드(템플릿). 비우면 사이트 기본 모양으로 보여줌
  is_builtin     boolean not null default false,       -- 사이트에 자리가 정해진 기본 그룹 (삭제 불가)
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 2) 배너 확장 ----------------------------------------------------------------------
alter table public.banner_ads add column if not exists group_id      uuid references public.banner_groups (id) on delete cascade;
alter table public.banner_ads add column if not exists texts         jsonb not null default '[]'::jsonb;   -- [{text, pc_size, m_size, color, bold}] 최대 10
alter table public.banner_ads add column if not exists colors        jsonb not null default '[]'::jsonb;   -- ["#000000", ...] 최대 4
alter table public.banner_ads add column if not exists html          text;
alter table public.banner_ads add column if not exists product_ids   uuid[] not null default '{}';
alter table public.banner_ads add column if not exists extra_images  text[] not null default '{}';
alter table public.banner_ads add column if not exists link_target   text not null default '_self';

-- 링크·기간은 비워도 되게 (항상 노출 / 링크 없는 배너)
alter table public.banner_ads alter column link_url drop not null;
alter table public.banner_ads alter column starts_at drop not null;
alter table public.banner_ads alter column ends_at drop not null;
alter table public.banner_ads drop constraint if exists banner_ads_period_check;
alter table public.banner_ads add constraint banner_ads_period_check check (starts_at is null or ends_at is null or ends_at > starts_at);
-- 위치(placement)는 이제 그룹 코드를 그대로 씁니다
alter table public.banner_ads drop constraint if exists banner_ads_placement_check;
alter table public.banner_ads drop constraint if exists banner_ads_category_check;
alter table public.banner_ads alter column image_pc drop not null;

-- 기본 그룹 만들기 (사이트에 자리가 정해진 배너들)
insert into public.banner_groups (code, name, kind, guide, is_builtin, sort_order) values
  ('top_bar',     '[상단] 탑배너',           'common', '최상단 띠배너. PC이미지=아이콘(선택), 텍스트1=문구(<b>굵게</b> 가능), 색상1=글자색, 색상2=배경색, 링크.', true, 10),
  ('quick_menu',  '[공통] 퀵메뉴',           'common', '화면 오른쪽 아래 떠 있는 바로가기 아이콘. PC이미지=아이콘(정사각형), 텍스트1=이름, 링크.', true, 20),
  ('detail_mini', '[상품상세] 미니 배너',     'common', '상품 상세페이지 문의 버튼 아래 작은 띠. PC이미지=아이콘, 텍스트1=문구, 색상1=글자색, 색상2=배경색, 링크.', true, 30),
  ('logo',        '[상단] 로고',             'common', '머리글 로고. PC이미지만 등록 (권장 높이 40px 이상). 비우면 글자 로고.', true, 40),
  ('menu_banner', '[전체메뉴] 배너',         'common', '전체 카테고리 펼침 메뉴 오른쪽 이미지. PC 250×230, 텍스트1=이름, 링크.', true, 50),
  ('popup',       '[메인] 팝업',             'common', '메인 화면 처음 열 때 뜨는 팝업. PC이미지 500×600 권장, 링크. "오늘 하루 보지 않기" 지원.', true, 60),
  ('main',        '[메인] 슬라이드 (A타입)', 'main',   '3장씩 넘어가는 메인 배너. 이미지 800×600, 텍스트1=회사명·제목, 텍스트2=전화번호, 링크.', true, 100),
  ('smart',       '[메인] 스마트 허브',       'hub',    '4칸 카드. 이미지 600×600, 텍스트1=회사명, 링크("홈페이지 바로가기").', true, 110),
  ('wide',        '[메인] 와이드 허브',       'hub',    '가로 띠 광고. 이미지 1200×200, 링크.', true, 120),
  ('partner',     '[메인] 파트너 허브',       'hub',    '공급사+제품. 이미지 600×400, 텍스트1=회사명, 링크, 상품(최대 3개 표시, 비우면 광고주 최신 제품).', true, 130),
  ('plus',        '[메인] 플러스 허브',       'hub',    '2칸 가로 광고. 이미지 800×300, 링크.', true, 140),
  ('auto_scroll', '[메인] 오토 스크롤 배너', 'main',   '천천히 흘러가는 로고 띠. PC이미지=로고(가로형), 링크.', true, 150),
  ('image',       '[메인] 큰 이미지 광고',    'hub',    '세로로 긴 홍보 이미지. 너비 1000px 이상, 링크.', true, 160),
  ('wing_left',   '[공통] 왼쪽 날개 배너',    'common', '넓은 PC 화면 왼쪽에 따라다니는 배너. 160×600.', true, 170),
  ('wing_right',  '[공통] 오른쪽 날개 배너',  'common', '넓은 PC 화면 오른쪽에 따라다니는 배너. 160×600.', true, 180),
  ('category',    '[카테고리] 상단 배너',     'hub',    '카테고리 제품 목록 위. 1200×300. 카테고리를 꼭 고르세요.', true, 190)
on conflict (code) do nothing;

-- 기존 배너를 그룹에 연결 + 회사명·전화를 텍스트1·2로 옮기기
update public.banner_ads b
set group_id = g.id
from public.banner_groups g
where b.group_id is null and g.code = b.placement;

update public.banner_ads
set texts = (
      case when coalesce(subtitle, '') <> '' or coalesce(phone, '') <> '' then
        jsonb_build_array(
          jsonb_build_object('text', coalesce(subtitle, ''), 'bold', true),
          jsonb_build_object('text', coalesce(phone, ''))
        )
      else '[]'::jsonb end
    ),
    link_target = case when link_url ~* '^https?://' then '_blank' else '_self' end
where texts = '[]'::jsonb;

create index if not exists banner_ads_group_idx on public.banner_ads (group_id, sort_order);

-- 3) 시점 복구 기록 ---------------------------------------------------------------------
create table if not exists public.banner_group_snapshots (
  id          bigint generated always as identity primary key,
  group_id    uuid not null references public.banner_groups (id) on delete cascade,
  data        jsonb not null,     -- 그 시점의 그룹 + 배너 목록
  banner_count int not null default 0,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists banner_group_snapshots_group_idx on public.banner_group_snapshots (group_id, created_at desc);

-- 보안: 관리는 서버(service role)만, 읽기는 플랫폼 관리자만 (사이트 표시는 서버가 service role로 읽음)
alter table public.banner_groups enable row level security;
alter table public.banner_group_snapshots enable row level security;
drop policy if exists banner_groups_admin_select on public.banner_groups;
create policy banner_groups_admin_select on public.banner_groups for select to authenticated using (public.is_platform_admin());
drop policy if exists banner_group_snapshots_admin_select on public.banner_group_snapshots;
create policy banner_group_snapshots_admin_select on public.banner_group_snapshots for select to authenticated using (public.is_platform_admin());
grant select on public.banner_groups, public.banner_group_snapshots to authenticated;
grant all on public.banner_groups, public.banner_group_snapshots to service_role;

-- 확인용
select g.name, count(b.id) as 배너_수
from public.banner_groups g left join public.banner_ads b on b.group_id = g.id
group by g.name, g.sort_order order by g.sort_order;
