-- 0015: 카테고리(상품분류) 상세 설정
-- - 표시 상태, 메인 화면 표시, 분류 설명, 상단 이미지, 상품 정렬 방식, 검색엔진(SEO) 문구
-- - 플랫폼 공통 카테고리는 전자동(플랫폼 관리자)이 관리합니다.
-- 여러 번 실행해도 안전합니다.

alter table public.categories add column if not exists description     text;
alter table public.categories add column if not exists is_visible      boolean not null default true;   -- 표시함 / 표시안함
alter table public.categories add column if not exists show_on_main    boolean not null default true;   -- 메인 화면 카테고리 칸에 표시
alter table public.categories add column if not exists top_image       text;                            -- 카테고리 페이지 상단 이미지 (미디어 경로)
alter table public.categories add column if not exists product_sort    text not null default 'latest';  -- 상품 정렬 방식
alter table public.categories add column if not exists seo_title       text;
alter table public.categories add column if not exists seo_description text;
alter table public.categories add column if not exists seo_keywords    text;
alter table public.categories add column if not exists updated_at      timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_product_sort_check') then
    alter table public.categories
      add constraint categories_product_sort_check
      check (product_sort in ('latest', 'oldest', 'name', 'price_asc', 'price_desc'));
  end if;
end $$;

-- 확인용
select count(*) as 카테고리_수,
       count(*) filter (where is_visible) as 표시중
from public.categories;
