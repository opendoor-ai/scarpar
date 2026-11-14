-- 0010: 플랫폼 공통 카테고리를 모든 공급사 직원이 읽을 수 있게 허용
-- 전자동(플랫폼)이 관리하는 카테고리를 다른 공급사도 상품 등록·목록에서 씁니다.
-- 카테고리 이름은 원래 공개 정보라(방문자도 읽기 가능) 보안상 문제가 없습니다.
-- 쓰기(추가·수정·삭제)는 여전히 각 조직의 관리자만 가능합니다.
-- 여러 번 실행해도 안전합니다.

drop policy if exists categories_select_active_orgs on public.categories;
create policy categories_select_active_orgs on public.categories
  for select to authenticated
  using (
    exists (
      select 1 from public.orgs o
      where o.id = categories.org_id and o.is_active = true
    )
  );

grant select on public.categories to authenticated;
