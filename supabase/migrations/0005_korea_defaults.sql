-- 0005: 한국 기준 기본값 (KRW 원화, 대한민국, 서울 시간)
-- Supabase SQL Editor에 붙여 넣고 Run 하면 됩니다. 여러 번 실행해도 안전합니다.

alter table public.orgs alter column currency set default 'KRW';
alter table public.orgs alter column country  set default 'KR';
alter table public.orgs alter column timezone set default 'Asia/Seoul';

-- 기존 조직(전자동 포함)을 한국 기준으로 변경
update public.orgs
   set currency = 'KRW', country = 'KR', timezone = 'Asia/Seoul'
 where currency <> 'KRW' or country <> 'KR' or timezone <> 'Asia/Seoul';

-- 쇼핑몰 언어 설정이 영어/벵골어로 저장되어 있으면 한국어로 변경
update public.org_settings
   set value = '"ko"'::jsonb
 where key = 'localization.language';
