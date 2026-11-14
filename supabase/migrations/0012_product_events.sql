-- 0012: 상품 광고 성과 통계 (조회수, 전화·문자 문의 버튼 클릭, 공유, QR 등)
-- - 기록: 쇼핑몰에서 서버가 service role로만 저장 (방문자 직접 쓰기 권한 없음)
-- - 조회: 각 공급사 직원은 자기 공급사 통계만, 플랫폼 관리자는 전체
-- - 개인정보: IP를 저장하지 않고, 하루 단위로 바뀌는 익명 값(visitor_hash)만 저장
-- 여러 번 실행해도 안전합니다.

create table if not exists public.product_events (
  id            bigint generated always as identity primary key,
  org_id        uuid not null references public.orgs (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  event_type    text not null check (event_type in (
                  'view',            -- 상세페이지 조회
                  'call_click',      -- 전화 문의 버튼
                  'sms_click',       -- 문자 문의 버튼 (문자 앱 열기)
                  'share_click',     -- 공유하기
                  'qr_open',         -- QR 코드 보기
                  'homepage_click',  -- 공급사 홈페이지 바로가기
                  'question_submit'  -- Q&A 질문 등록
                )),
  visitor_hash  text,                -- 같은 사람 중복 집계 방지용 익명 값 (하루마다 바뀜)
  created_at    timestamptz not null default now()
);

create index if not exists product_events_org_time_idx on public.product_events (org_id, created_at desc);
create index if not exists product_events_product_time_idx on public.product_events (product_id, created_at desc);
create index if not exists product_events_dedupe_idx on public.product_events (product_id, event_type, visitor_hash, created_at desc);

alter table public.product_events enable row level security;

drop policy if exists product_events_select on public.product_events;
create policy product_events_select on public.product_events
  for select to authenticated
  using (public.is_org_member(org_id) or public.is_platform_admin());

grant select on public.product_events to authenticated;
grant all on public.product_events to service_role;

-- 기간별 상품 성과 (상품별 합계) — 호출한 사람의 권한(RLS) 그대로 적용
create or replace function public.product_event_summary(p_org uuid, p_from timestamptz, p_to timestamptz)
returns table (
  product_id uuid,
  views bigint,
  call_clicks bigint,
  sms_clicks bigint,
  share_clicks bigint,
  qr_opens bigint,
  homepage_clicks bigint,
  questions bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.product_id,
    count(*) filter (where e.event_type = 'view'),
    count(*) filter (where e.event_type = 'call_click'),
    count(*) filter (where e.event_type = 'sms_click'),
    count(*) filter (where e.event_type = 'share_click'),
    count(*) filter (where e.event_type = 'qr_open'),
    count(*) filter (where e.event_type = 'homepage_click'),
    count(*) filter (where e.event_type = 'question_submit')
  from public.product_events e
  where e.org_id = p_org and e.created_at >= p_from and e.created_at < p_to
  group by e.product_id;
$$;

-- 기간별 일자 추이 (서울 기준 날짜)
create or replace function public.product_event_daily(p_org uuid, p_from timestamptz, p_to timestamptz)
returns table (day date, views bigint, inquiries bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (e.created_at at time zone 'Asia/Seoul')::date as day,
    count(*) filter (where e.event_type = 'view'),
    count(*) filter (where e.event_type in ('call_click', 'sms_click', 'question_submit'))
  from public.product_events e
  where e.org_id = p_org and e.created_at >= p_from and e.created_at < p_to
  group by 1
  order by 1;
$$;

grant execute on function public.product_event_summary(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.product_event_daily(uuid, timestamptz, timestamptz) to authenticated;

-- 확인용
select count(*) as 기록_수 from public.product_events;
