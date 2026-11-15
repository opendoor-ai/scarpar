-- 0034: 1차 분류 이름에서 빠진 단어 채우기 (jadong.co.kr 분류 이름과 똑같이)
--   자동화·FA·로봇        → 계측·측정·자동화·FA·로봇
--   식품·제약·화장품기계  → 식품·화학·제약·화장품기계
--   플라스틱·금형·사출    → 고무·플라스틱·금형·사출
--   공구·부품·소재(MRO)   → 공구·부품·소재·안전용품
--   기타·중고·서비스      → 일반산업기계·서비스·기타
--   레이저가공기·용접기   → 레이저가공기(절단·컷팅)·용접기
-- 분류 주소(slug)·번호(cate_no)·하위 분류·등록 제품은 그대로예요. 여러 번 실행해도 안전합니다.
-- (이름은 나중에 관리자 → 카테고리에서 언제든 다시 바꿀 수 있어요)

update public.categories c
   set name = v.name
  from (values
    ('machine-tools', '공작기계·금속가공'),
    ('laser-welding', '레이저가공기(절단·컷팅)·용접기'),
    ('automation-fa-robot', '계측·측정·자동화·FA·로봇'),
    ('packaging-logistics', '포장·물류·운반'),
    ('food-pharma-cosmetic', '식품·화학·제약·화장품기계'),
    ('plastic-mold-injection', '고무·플라스틱·금형·사출'),
    ('pneumatic-hvac-energy', '유공압·공조·에너지'),
    ('electrical-electronics', '전기·전자·반도체'),
    ('environment-construction', '환경·건설·농기계'),
    ('tools-parts-mro', '공구·부품·소재·안전용품'),
    ('etc-used-service', '일반산업기계·서비스·기타')
  ) as v(slug, name)
 where c.slug = v.slug
   and c.parent_id is null
   and c.org_id = (select id from public.orgs where slug = 'jadong');

-- 결과 확인: 11개 분류와 하위 분류 수 (모두 합치면 202개)
select c.sort_order as 순서, c.name as 분류,
       (select count(*) from public.categories k where k.parent_id = c.id) as 하위_수
  from public.categories c
  join public.orgs o on o.id = c.org_id and o.slug = 'jadong'
 where c.parent_id is null
 order by c.sort_order;
