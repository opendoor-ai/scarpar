-- 0028: 메인 관리자(플랫폼 관리자)가 모든 공급사의 관리자 화면을 열어 대신 관리할 수 있게
-- - 공급사 직원 여부를 확인하는 두 함수에 "플랫폼 관리자이면 통과"를 더해요.
--   (공급사 직원으로 등록하지 않아도 되므로, 공급사의 직원 목록에는 나타나지 않아요)
-- 여러 번 실행해도 안전합니다.

create or replace function public.is_org_member(o uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = o and user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

create or replace function public.has_org_role(o uuid, roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = o and user_id = auth.uid() and role = any(roles)
  ) or public.is_platform_admin();
$$;

-- 확인용: 플랫폼 관리자 수
select count(*) as 플랫폼_관리자_수 from public.platform_admins;
