-- 0009: 상품 Q&A 게시판 (상품 상세페이지 "Q&A" 탭)
-- - 고객: 상세페이지에서 질문 작성 (서버에서 service role로 저장 — 방문자 직접 쓰기 권한 없음)
-- - 공급사 직원: 관리자 화면에서 답변·숨김 처리
-- - 공개 화면: 서버가 비밀글 내용·연락처를 가린 뒤 보여줌 (방문자 직접 읽기 권한 없음)
-- 여러 번 실행해도 안전합니다.

create table if not exists public.product_questions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.orgs (id) on delete cascade,
  product_id      uuid not null references public.products (id) on delete cascade,
  author_name     text not null,
  author_contact  text,                 -- 전화번호 또는 이메일 (공개하지 않음)
  question        text not null,
  is_private      boolean not null default false,  -- 비밀글: 내용은 공급사만 봄
  answer          text,
  answered_at     timestamptz,
  answered_by     uuid references auth.users (id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending', 'answered', 'hidden')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists product_questions_product_idx on public.product_questions (product_id, created_at desc);
create index if not exists product_questions_org_status_idx on public.product_questions (org_id, status);

alter table public.product_questions enable row level security;

drop policy if exists product_questions_select_members on public.product_questions;
create policy product_questions_select_members on public.product_questions
  for select to authenticated using (is_org_member(org_id));

drop policy if exists product_questions_write_staff on public.product_questions;
create policy product_questions_write_staff on public.product_questions
  for all to authenticated
  using (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]))
  with check (has_org_role(org_id, array['owner', 'admin', 'manager', 'staff']::text[]));

grant select, insert, update, delete on public.product_questions to authenticated;
grant all on public.product_questions to service_role;

-- 확인용
select count(*) as 질문_수 from public.product_questions;
