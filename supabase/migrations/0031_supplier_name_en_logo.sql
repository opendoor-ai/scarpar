-- 0031: 공급사 영문명 + 입점 신청 때 영문명·로고 받기
-- - 공급사명(한글) · 영문명 · 회사 로고 → 공급사 미니샵 목록 · "함께하는 공급사" 띠에 자동으로 보여요
-- 여러 번 실행해도 안전합니다.

alter table public.orgs add column if not exists name_en text;   -- 공급사 영문명 (예: KIHYUN)

alter table public.supplier_applications add column if not exists name_en   text;  -- 신청 영문명
alter table public.supplier_applications add column if not exists logo_path text;  -- 신청 로고 (media 버킷 경로)

-- 방문자에게 영문명도 보이게 (0029에서 방문자용 공개 칸을 따로 정해 둠)
grant select (name_en) on public.orgs to anon;

select count(*) as 공급사_수, count(logo_path) as 로고_있는_공급사 from public.orgs where is_active;
