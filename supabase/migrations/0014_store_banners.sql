-- 0014: 공급사 미니샵 배너 (기준서 8단계 — 공급사별 PC/모바일 배너 관리)
-- - 각 공급사가 자기 미니샵 홈 맨 위에 보여줄 배너를 직접 등록 (PC/모바일 이미지, 기간, 순서)
-- - 방문자는 "켜져 있고 기간 안인" 배너만 읽을 수 있음
-- 여러 번 실행해도 안전합니다.

create table if not exists public.store_banners (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs (id) on delete cascade,
  title        text not null,                 -- 관리용 이름 (이미지 대체 글자로도 사용)
  link_url     text,                          -- 누르면 갈 주소 (없으면 그냥 이미지)
  image_pc     text not null,                 -- PC 이미지 (미디어 경로)
  image_mobile text,                          -- 모바일 이미지 (없으면 PC 이미지 사용)
  starts_at    timestamptz,                   -- 없으면 바로 시작
  ends_at      timestamptz,                   -- 없으면 계속
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint store_banners_period_check check (starts_at is null or ends_at is null or ends_at > starts_at)
);
create index if not exists store_banners_org_idx on public.store_banners (org_id, sort_order);

alter table public.store_banners enable row level security;

-- 방문자: 지금 보여줄 배너만
drop policy if exists store_banners_public_select on public.store_banners;
create policy store_banners_public_select on public.store_banners
  for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

-- 공급사 직원: 자기 공급사 배너 전부 보기
drop policy if exists store_banners_select_members on public.store_banners;
create policy store_banners_select_members on public.store_banners
  for select to authenticated using (is_org_member(org_id));

-- 공급사 직원(staff 이상): 등록·수정·삭제
drop policy if exists store_banners_write_staff on public.store_banners;
create policy store_banners_write_staff on public.store_banners
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

grant select on public.store_banners to anon;
grant select, insert, update, delete on public.store_banners to authenticated;
grant all on public.store_banners to service_role;

-- 확인용
select count(*) as 미니샵_배너_수 from public.store_banners;
