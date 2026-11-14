-- 0026: 공급사 등급(무료·유료) + 상품 점프(최상단으로 올리기)
-- - 공급사 등급: 회원등급처럼 플랫폼 관리자가 만들고 고침. 등급마다 하루 점프 개수(추천·일반)를 정함
--   기본: 무료공급사(점프 없음), 유료공급사(추천 3 + 일반 7 = 하루 10개)
-- - 점프: 상품의 "진열 시각(display_at)"을 지금으로 바꿔서 목록 맨 위로 올림
--   하루(한국 시간 0시 기준) 사용 개수는 product_jumps 기록으로 셈
-- 여러 번 실행해도 안전합니다.

-- 1) 공급사 등급 ----------------------------------------------------------------
create table if not exists public.supplier_grades (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,            -- 영문 코드 (free, paid …)
  name                 text not null,                   -- 화면 이름 (무료공급사, 유료공급사 …)
  description          text,
  is_paid              boolean not null default false,  -- 유료 등급인지
  jump_featured_limit  int not null default 0 check (jump_featured_limit between 0 and 100), -- 하루 점프: 추천 제품
  jump_normal_limit    int not null default 0 check (jump_normal_limit between 0 and 100),   -- 하루 점프: 일반 제품
  color                text not null default '#64748b',
  sort_order           int not null default 0,
  is_default           boolean not null default false,  -- 새 공급사·기간 끝난 공급사가 받는 등급
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

insert into public.supplier_grades (code, name, description, is_paid, jump_featured_limit, jump_normal_limit, color, sort_order, is_default) values
  ('free', '무료공급사', '무료로 제품을 등록하는 공급사예요. 점프 기능이 없어요.', false, 0, 0, '#64748b', 10, true),
  ('paid', '유료공급사', '광고비를 내는 공급사예요. 하루 점프 10개 (추천 제품 3 + 일반 제품 7).', true, 3, 7, '#2563eb', 20, false)
on conflict (code) do nothing;

alter table public.supplier_grades enable row level security;
drop policy if exists supplier_grades_read on public.supplier_grades;
create policy supplier_grades_read on public.supplier_grades for select to anon, authenticated using (true);
grant select on public.supplier_grades to anon, authenticated;
grant all on public.supplier_grades to service_role;
-- 등급 추가·수정은 서버에서 플랫폼 관리자 확인 후 service role로만

-- 2) 공급사(조직)에 등급 연결 ---------------------------------------------------
alter table public.orgs add column if not exists supplier_grade_id uuid references public.supplier_grades (id) on delete set null;
alter table public.orgs add column if not exists grade_until date;   -- 유료 기간 끝나는 날 (비우면 계속)
alter table public.orgs add column if not exists grade_memo  text;   -- 관리자 메모 (입금·계약 내용 등)

-- 3) 상품 진열 시각 (점프하면 지금으로 바뀜) --------------------------------------
alter table public.products add column if not exists display_at timestamptz;
update public.products set display_at = created_at where display_at is null;
alter table public.products alter column display_at set default now();
alter table public.products alter column display_at set not null;
alter table public.products add column if not exists jumped_at timestamptz;  -- 마지막 점프 시각
create index if not exists products_display_at_idx on public.products (status, display_at desc);
create index if not exists products_org_display_at_idx on public.products (org_id, display_at desc);

-- 4) 점프 기록 (하루 사용 개수 세기) ---------------------------------------------
create table if not exists public.product_jumps (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  kind        text not null check (kind in ('featured', 'normal')),  -- 추천 / 일반
  jumped_by   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists product_jumps_org_day_idx on public.product_jumps (org_id, created_at desc);

alter table public.product_jumps enable row level security;
drop policy if exists product_jumps_select_members on public.product_jumps;
create policy product_jumps_select_members on public.product_jumps
  for select to authenticated using (public.is_org_member(org_id));
grant select on public.product_jumps to authenticated;
grant all on public.product_jumps to service_role;
-- 기록 추가는 아래 jump_products 함수로만

-- 5) 공급사의 지금 등급 (기간이 끝났거나 없으면 기본 등급) ------------------------
create or replace function public.effective_supplier_grade(p_org uuid)
returns public.supplier_grades
language sql
stable
security definer
set search_path = public
as $$
  select g.*
  from public.supplier_grades g
  where g.id = coalesce(
    (select o.supplier_grade_id from public.orgs o
      where o.id = p_org
        and (o.grade_until is null or o.grade_until >= (now() at time zone 'Asia/Seoul')::date)),
    (select d.id from public.supplier_grades d where d.is_default order by d.sort_order limit 1)
  )
$$;

-- 6) 점프 실행 — 한 번에 여러 개. 하나라도 한도를 넘으면 아무것도 안 올림 ----------
create or replace function public.jump_products(p_product_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org        uuid;
  v_orgs       int;
  v_grade      public.supplier_grades;
  v_day_start  timestamptz := ((now() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul';
  v_used_f     int;
  v_used_n     int;
  v_need_f     int;
  v_need_n     int;
  v_inactive   int;
begin
  if p_product_ids is null or array_length(p_product_ids, 1) is null then
    raise exception '점프할 제품을 선택하세요';
  end if;

  select count(distinct org_id), min(org_id::text)::uuid into v_orgs, v_org
    from public.products where id = any(p_product_ids);
  if v_orgs <> 1 then
    raise exception '제품을 찾을 수 없어요';
  end if;
  if not public.has_org_role(v_org, array['owner', 'admin', 'manager', 'staff']) then
    raise exception '이 공급사의 제품만 점프할 수 있어요';
  end if;

  select * into v_grade from public.effective_supplier_grade(v_org);
  if v_grade.id is null or (v_grade.jump_featured_limit + v_grade.jump_normal_limit) = 0 then
    raise exception '%은(는) 점프 기능이 없어요. 유료공급사로 바꾸면 쓸 수 있어요.', coalesce(v_grade.name, '무료공급사');
  end if;

  select count(*) filter (where status <> 'active') into v_inactive from public.products where id = any(p_product_ids);
  if v_inactive > 0 then
    raise exception '판매중인 제품만 점프할 수 있어요';
  end if;

  select count(*) filter (where is_featured), count(*) filter (where not is_featured)
    into v_need_f, v_need_n
    from public.products where id = any(p_product_ids);

  select count(*) filter (where kind = 'featured'), count(*) filter (where kind = 'normal')
    into v_used_f, v_used_n
    from public.product_jumps where org_id = v_org and created_at >= v_day_start;

  if v_used_f + v_need_f > v_grade.jump_featured_limit then
    raise exception '오늘 추천 제품 점프는 %개까지예요. (남은 개수 %개)', v_grade.jump_featured_limit, greatest(0, v_grade.jump_featured_limit - v_used_f);
  end if;
  if v_used_n + v_need_n > v_grade.jump_normal_limit then
    raise exception '오늘 일반 제품 점프는 %개까지예요. (남은 개수 %개)', v_grade.jump_normal_limit, greatest(0, v_grade.jump_normal_limit - v_used_n);
  end if;

  update public.products
     set display_at = now(), jumped_at = now()
   where id = any(p_product_ids);

  insert into public.product_jumps (org_id, product_id, kind, jumped_by)
  select v_org, p.id, case when p.is_featured then 'featured' else 'normal' end, auth.uid()
    from public.products p where p.id = any(p_product_ids);

  return jsonb_build_object(
    'jumped', array_length(p_product_ids, 1),
    'featured_used', v_used_f + v_need_f, 'featured_limit', v_grade.jump_featured_limit,
    'normal_used', v_used_n + v_need_n, 'normal_limit', v_grade.jump_normal_limit
  );
end;
$$;

revoke all on function public.jump_products(uuid[]) from public;
grant execute on function public.jump_products(uuid[]) to authenticated;
grant execute on function public.effective_supplier_grade(uuid) to authenticated, service_role;

-- 확인용
select code, name, jump_featured_limit as 추천_점프, jump_normal_limit as 일반_점프 from public.supplier_grades order by sort_order;
