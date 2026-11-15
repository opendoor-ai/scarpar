-- 0032: 1차 분류 "레이저가공기·용접기" 추가 (jadong.co.kr 처럼 11개 분류)
-- - "공작기계·금속가공" 바로 다음 순서에 새로 만들고, 그 아래 있던 레이저·용접 2차 분류 3개를 옮겨요.
--   (레이저가공기·레이저절단기 / 레이저용접기·레이저마킹기 / 용접기·용접자동화 — 등록된 제품도 그대로 따라와요)
-- - 분류 번호(cate_no)는 자동으로 붙어요. 아이콘 그림은 관리자 → 카테고리에서 올려 주세요.
-- 여러 번 실행해도 안전합니다.

do $$
declare
  v_org   uuid;
  v_mt    record;
  v_new   uuid;
begin
  select id into v_org from public.orgs where slug = 'jadong';
  if v_org is null then
    raise notice '전자동(jadong) 회사를 찾지 못했어요.';
    return;
  end if;

  select id, sort_order into v_mt from public.categories where org_id = v_org and slug = 'machine-tools' and parent_id is null;

  select id into v_new from public.categories where org_id = v_org and slug = 'laser-welding';
  if v_new is null then
    -- 뒤에 있는 1차 분류 순서를 한 칸씩 밀고, 공작기계 바로 다음에 넣기
    update public.categories
       set sort_order = sort_order + 1
     where org_id = v_org and parent_id is null and sort_order > coalesce(v_mt.sort_order, 0);

    insert into public.categories (org_id, name, slug, parent_id, sort_order)
    values (v_org, '레이저가공기·용접기', 'laser-welding', null, coalesce(v_mt.sort_order, 0) + 1)
    returning id into v_new;
  end if;

  -- 레이저·용접 2차 분류 옮기기
  update public.categories
     set parent_id = v_new
   where org_id = v_org
     and slug in ('machine-tools-34', 'machine-tools-35', 'machine-tools-36');
end $$;

select c.cate_no as 분류번호, c.name as 분류, (select count(*) from public.categories k where k.parent_id = c.id) as 하위_수
  from public.categories c
  join public.orgs o on o.id = c.org_id and o.slug = 'jadong'
 where c.parent_id is null
 order by c.sort_order;
