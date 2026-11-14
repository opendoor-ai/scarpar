-- 0011: 공급사 입점 신청 (일반회원 신청 → 플랫폼 관리자 승인 → 공급사 자동 생성)
-- 여러 번 실행해도 안전합니다.

create table if not exists public.supplier_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,  -- 신청한 회원
  company_name    text not null,           -- 회사명
  desired_slug    text not null,           -- 원하는 미니샵 주소 (영문)
  business_number text,                    -- 사업자등록번호
  contact_name    text not null,           -- 담당자명
  phone           text not null,           -- 연락처
  email           text,                    -- 이메일
  address         text,                    -- 사업장 주소
  homepage_url    text,                    -- 홈페이지
  item_keywords   text[],                  -- 취급품목
  message         text,                    -- 신청 메모
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  reject_reason   text,                    -- 거절 사유 (신청자에게 보여줌)
  org_id          uuid references public.orgs (id) on delete set null,  -- 승인 시 만들어진 공급사
  reviewed_by     uuid references auth.users (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists supplier_applications_status_idx on public.supplier_applications (status, created_at desc);
create index if not exists supplier_applications_user_idx on public.supplier_applications (user_id);
-- 한 회원은 동시에 하나의 "대기 중" 신청만
create unique index if not exists supplier_applications_one_pending
  on public.supplier_applications (user_id) where status = 'pending';

alter table public.supplier_applications enable row level security;

-- 본인 신청은 본인이, 모든 신청은 플랫폼 관리자가 볼 수 있음
drop policy if exists supplier_applications_select on public.supplier_applications;
create policy supplier_applications_select on public.supplier_applications
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- 본인 이름으로 "대기" 상태의 신청만 넣을 수 있음
drop policy if exists supplier_applications_insert_own on public.supplier_applications;
create policy supplier_applications_insert_own on public.supplier_applications
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and org_id is null and reviewed_by is null);

-- 승인·거절(수정)은 서버에서 플랫폼 관리자 확인 후 service role로만 처리 (수정 정책 없음)

grant select, insert on public.supplier_applications to authenticated;
grant all on public.supplier_applications to service_role;

-- 확인용
select count(*) as 신청_수 from public.supplier_applications;
