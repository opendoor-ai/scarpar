-- 0033: 1차 분류 순서 정리 — "레이저가공기·용접기"를 "공작기계·금속가공" 바로 다음(2번째)으로
-- (기존 1차 분류 10개의 순서 번호가 모두 0이라서 새 분류가 맨 뒤로 갔어요)
-- 분류 주소(slug)마다 순서 번호를 직접 정해요. 여러 번 실행해도 안전합니다.

update public.categories c
   set sort_order = v.ord
  from (values
    ('machine-tools', 1),
    ('laser-welding', 2),
    ('automation-fa-robot', 3),
    ('packaging-logistics', 4),
    ('food-pharma-cosmetic', 5),
    ('plastic-mold-injection', 6),
    ('pneumatic-hvac-energy', 7),
    ('electrical-electronics', 8),
    ('environment-construction', 9),
    ('tools-parts-mro', 10),
    ('etc-used-service', 11)
  ) as v(slug, ord)
 where c.slug = v.slug
   and c.parent_id is null
   and c.org_id = (select id from public.orgs where slug = 'jadong');

-- 결과 확인: 순서 1~11이 보이면 성공
select c.sort_order as 순서, c.cate_no as 분류번호, c.name as 분류
  from public.categories c
  join public.orgs o on o.id = c.org_id and o.slug = 'jadong'
 where c.parent_id is null
 order by c.sort_order;
