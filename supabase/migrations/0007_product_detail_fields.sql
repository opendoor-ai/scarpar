-- 0007: 상품 상세페이지용 정보 칸 추가 (전자동 상세페이지 레이아웃 1단계)
-- Supabase SQL Editor에 붙여 넣고 Run 하면 됩니다. 여러 번 실행해도 안전합니다.

-- ---------------------------------------------------------------------------
-- 1) 상품 번호(상품코드): 플랫폼 전체에서 하나뿐인 번호, 10001부터 자동 부여
--    나중에 상품 주소를 /s/{공급사}/products/{번호} 형태로 쓰기 위한 준비입니다.
-- ---------------------------------------------------------------------------
create sequence if not exists public.products_product_no_seq start with 10001;

alter table public.products
  add column if not exists product_no bigint;

-- 기존 상품에 번호 채우기 (등록 순서대로)
update public.products p
   set product_no = nextval('public.products_product_no_seq')
  from (select id from public.products where product_no is null order by created_at) t
 where p.id = t.id;

alter table public.products
  alter column product_no set default nextval('public.products_product_no_seq'),
  alter column product_no set not null;

alter sequence public.products_product_no_seq owned by public.products.product_no;

create unique index if not exists products_product_no_key on public.products (product_no);

-- 로그인한 직원이 상품을 등록할 때 번호를 받을 수 있게 허용
grant usage, select on sequence public.products_product_no_seq to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) 상품 상세 정보 칸
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists condition         text,  -- new(신품) / used(중고) / refurbished(리퍼)
  add column if not exists model_name        text,  -- 모델명
  add column if not exists spec_summary      text,  -- 제품사양 (한 줄 요약)
  add column if not exists short_description text,  -- 간략설명
  add column if not exists detail_html       text;  -- 상세 내용 (이미지·서식 포함)

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_condition_check') then
    alter table public.products
      add constraint products_condition_check
      check (condition is null or condition in ('new', 'used', 'refurbished'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) 공급사(조직) 소개 카드용 칸
-- ---------------------------------------------------------------------------
alter table public.orgs
  add column if not exists contact_name  text,    -- 담당자명 (예: 대표 홍길동)
  add column if not exists homepage_url  text,    -- 홈페이지 주소
  add column if not exists item_keywords text[];  -- 취급품목 (태그)

-- 확인용
select product_no as 상품번호, name as 상품명, condition as 상태
  from public.products
 order by product_no;
