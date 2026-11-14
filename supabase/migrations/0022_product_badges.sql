-- 0022: 상품 아이콘·제작 정보
-- - badges: 대표이미지에 붙는 아이콘 (직접거래·급매·특가·렌탈가능·설치/AS·추천)
-- - origin: 원산지, manufacture_year: 제조연도(연식)
-- 여러 번 실행해도 안전합니다.

alter table public.products add column if not exists badges text[] not null default '{}';
alter table public.products add column if not exists origin text;
alter table public.products add column if not exists manufacture_year int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_manufacture_year_check') then
    alter table public.products
      add constraint products_manufacture_year_check check (manufacture_year is null or manufacture_year between 1900 and 2100);
  end if;
end $$;

-- 기존 상품은 모두 "직접거래" 아이콘을 기본으로 (jadong.co.kr 표시와 같게)
update public.products set badges = array['direct'] where badges = '{}';

select count(*) as 상품_수, count(*) filter (where 'direct' = any(badges)) as 직접거래_표시 from public.products;
