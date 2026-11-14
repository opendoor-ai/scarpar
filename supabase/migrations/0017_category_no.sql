-- 0017: 카테고리 번호(cate_no) 자동 부여 — 카페24처럼 /products?cate_no=54 형태 주소
-- - 모든 카테고리에 고유 번호를 붙이고, 새로 만드는 카테고리는 자동으로 다음 번호를 받습니다.
-- - 기존 카테고리는 1차 → 2차, 정렬 순서대로 번호를 매깁니다 (1부터).
-- - 영문 주소(slug)는 내부용으로만 남겨 둡니다 (예전 링크 자동 연결용).
-- 여러 번 실행해도 안전합니다.

create sequence if not exists public.category_no_seq start 1;

alter table public.categories add column if not exists cate_no bigint;

-- 아직 번호가 없는 카테고리에 순서대로 번호 매기기
do $$
declare
  r record;
begin
  for r in
    select c.id
    from public.categories c
    left join public.categories p on p.id = c.parent_id
    where c.cate_no is null
    order by c.org_id, coalesce(p.sort_order, c.sort_order), (c.parent_id is not null), c.sort_order, c.created_at
  loop
    update public.categories set cate_no = nextval('public.category_no_seq') where id = r.id;
  end loop;
end $$;

-- 이미 번호가 있었다면 다음 번호가 겹치지 않게 맞추기
select setval('public.category_no_seq', greatest((select coalesce(max(cate_no), 0) from public.categories), 1));

alter table public.categories alter column cate_no set default nextval('public.category_no_seq');
alter table public.categories alter column cate_no set not null;
create unique index if not exists categories_cate_no_key on public.categories (cate_no);

grant usage, select on sequence public.category_no_seq to authenticated, service_role;

-- 확인용
select cate_no, name, slug from public.categories where parent_id is null order by cate_no limit 20;
