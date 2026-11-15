-- 0030: 메인 "인기 기계 블로그와 함께 찾는 제품" — 블로그 작성자 + 함께 보여줄 제품 3개
-- 여러 번 실행해도 안전합니다.

alter table public.site_contents add column if not exists author      text;                   -- 블로그 작성자 (by. ○○)
alter table public.site_contents add column if not exists product_ids uuid[] not null default '{}';  -- 함께 보여줄 제품 (최대 3개, 순서대로)

-- 예전에 1개만 연결한 블로그는 그 제품을 첫 번째로
update public.site_contents
   set product_ids = array[product_id]
 where product_id is not null and coalesce(array_length(product_ids, 1), 0) = 0;

select count(*) filter (where kind = 'blog') as 블로그_수 from public.site_contents;
