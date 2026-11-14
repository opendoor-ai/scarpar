-- 0025: 구매문의 (고객이 찾는 제품을 올리면 공급사가 연락)
-- - 고객: 회원가입 없이 등록 (서버에서 검증 후 service role로 저장)
-- - 공개 화면: 서버가 연락처를 가린 뒤 보여줌 (방문자 직접 읽기 권한 없음)
-- - 공급사: 관리자 화면에서 전체 연락처 확인 + "상담하기" 기록
-- 여러 번 실행해도 안전합니다.

create table if not exists public.purchase_requests (
  id            uuid primary key default gen_random_uuid(),
  request_no    bigint generated always as identity,       -- 화면에 보이는 번호
  title         text not null,                              -- 제품명
  condition     text not null default 'any'
                  check (condition in ('any', 'new', 'used')), -- 무관 / 신품 / 중고
  detail        text not null,                              -- 상세 내용
  images        text[] not null default '{}',               -- 첨부 사진 (media 버킷 경로)
  author_name   text not null,                              -- 문의자 (업체명 또는 성함)
  phone         text not null,                              -- 연락처 (공개 화면에서는 가림)
  email         text,
  region        text,                                       -- 지역 (선택)
  status        text not null default 'open'
                  check (status in ('open', 'in_progress', 'done', 'hidden')), -- 상담가능 / 상담중 / 상담완료 / 숨김
  view_count    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists purchase_requests_no_idx on public.purchase_requests (request_no);
create index if not exists purchase_requests_list_idx on public.purchase_requests (status, created_at desc);

-- 상담한 공급사 (한 공급사는 한 문의에 한 번)
create table if not exists public.purchase_request_responses (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.purchase_requests (id) on delete cascade,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  memo        text,                                         -- 공급사 내부 메모
  created_at  timestamptz not null default now(),
  unique (request_id, org_id)
);
create index if not exists purchase_request_responses_request_idx on public.purchase_request_responses (request_id);

alter table public.purchase_requests enable row level security;
alter table public.purchase_request_responses enable row level security;

-- 읽기·쓰기는 모두 서버(service role)에서 권한 확인 후 처리합니다. (방문자·회원 직접 접근 없음)
grant all on public.purchase_requests to service_role;
grant all on public.purchase_request_responses to service_role;

-- 확인용
select count(*) as 구매문의_수 from public.purchase_requests;
