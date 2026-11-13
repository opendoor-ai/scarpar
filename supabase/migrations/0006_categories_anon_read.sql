-- 0006: 쇼핑몰 방문자(로그인 안 한 사람)가 공개 정보를 읽을 수 있게 권한 부여
-- 원인: 이 Supabase 프로젝트는 표마다 anon 읽기 권한(GRANT)이 자동으로 주어지지 않아
--       "permission denied for table categories" 오류가 났습니다.
-- 보안 규칙(RLS)은 그대로라서, 공개(활성) 상태인 데이터만 보입니다.
-- 여러 번 실행해도 안전합니다.

grant select on public.categories       to anon;
grant select on public.products         to anon;
grant select on public.product_variants to anon;
grant select on public.product_images   to anon;
grant select on public.media            to anon;
grant select on public.reviews          to anon;
grant select on public.cms_pages        to anon;
grant select on public.menus            to anon;
grant select on public.orgs             to anon;
grant select on public.courses          to anon;
grant select on public.lessons          to anon;
grant select on public.listings         to anon;

-- 확인용: 상품별로 연결된 카테고리를 보여줍니다.
select p.name as 상품명, c.name as 카테고리
  from public.products p
  left join public.categories c on c.id = p.category_id;
