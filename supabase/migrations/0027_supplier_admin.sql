-- 0027: 공급사 관리 강화 — 운영 상태 사유 + 변경 기록(운영 상태·등급)
-- 여러 번 실행해도 안전합니다.

alter table public.orgs add column if not exists status_reason     text;        -- 중지 사유 (공급사에게도 안내)
alter table public.orgs add column if not exists status_changed_at timestamptz; -- 운영 상태를 마지막으로 바꾼 때

-- 공급사 관리 기록 (누가 언제 무엇을 바꿨는지)
create table if not exists public.supplier_admin_logs (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  kind        text not null check (kind in ('status', 'grade', 'info')),  -- 운영 상태 / 등급 / 정보
  summary     text not null,                                             -- 예: "운영중 → 중지", "무료공급사 → 유료공급사 (2027-05-15까지)"
  memo        text,                                                      -- 사유·메모
  changed_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists supplier_admin_logs_org_idx on public.supplier_admin_logs (org_id, created_at desc);

alter table public.supplier_admin_logs enable row level security;
-- 읽기·쓰기 모두 서버(service role)에서 플랫폼 관리자 확인 후 처리
grant all on public.supplier_admin_logs to service_role;

select count(*) as 공급사_수 from public.orgs;
