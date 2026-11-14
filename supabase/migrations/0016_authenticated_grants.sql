-- 0016: 로그인한 사용자(authenticated) 표 사용 권한 일괄 정리
-- 이 Supabase 프로젝트는 표 권한(GRANT)이 자동으로 붙지 않아서 "permission denied" 오류가 났습니다.
-- (예: 페이지 편집 기록 cms_revisions 저장 실패)
--
-- 안전장치: "보안 규칙(RLS)이 켜진 표"에만 권한을 줍니다.
--          누가 어떤 행을 보고 고칠 수 있는지는 기존 보안 규칙이 그대로 막습니다.
-- 여러 번 실행해도 안전합니다.

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public' and rowsecurity = true
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t.tablename);
    execute format('grant all on public.%I to service_role', t.tablename);
  end loop;
end $$;

-- 자동 번호(identity·sequence) 사용 권한
grant usage, select on all sequences in schema public to authenticated, service_role;

-- 확인용: 보안 규칙이 꺼져 있어서 권한을 주지 않은 표 (비어 있으면 정상)
select tablename as 보안규칙_꺼진_표 from pg_tables where schemaname = 'public' and rowsecurity = false;
