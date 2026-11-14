-- 0029: 공급사 기본정보 (카페24 공급사 기본정보처럼) + 판매정보 표시설정 + 공개 칸 정리
-- 여러 번 실행해도 안전합니다.

-- 1) 공급사 기본정보 칸
alter table public.orgs add column if not exists fax           text;                         -- 팩스번호
alter table public.orgs add column if not exists contacts      jsonb not null default '[]';  -- 담당자 (최대 3명: name, phone, email)
alter table public.orgs add column if not exists company_intro text;                         -- 회사소개 (HTML)
alter table public.orgs add column if not exists biz_name      text;                         -- 사업자 상호명
alter table public.orgs add column if not exists ceo_name      text;                         -- 대표자명
alter table public.orgs add column if not exists biz_type      text;                         -- 업태
alter table public.orgs add column if not exists biz_item      text;                         -- 종목

-- 2) 판매정보 표시설정 (상품 상세페이지 · 미니샵에 보이는 공급사 정보 상자)
alter table public.orgs add column if not exists seller_info_detail_enabled boolean not null default true;
alter table public.orgs add column if not exists seller_info_detail_html    text;   -- 비우면 기본 표(업체명·담당자·연락처…)
alter table public.orgs add column if not exists seller_info_shop_enabled   boolean not null default true;
alter table public.orgs add column if not exists seller_info_shop_html      text;

-- 3) 방문자(로그인 안 한 사람)가 읽을 수 있는 칸만 열기
--    등급 메모(입금 내용)·중지 사유·등급 기간 등 관리용 칸은 방문자에게 보이지 않게 해요.
--    ※ 앞으로 orgs 표에 "공개해도 되는 칸"을 새로 만들면 여기 목록에도 더해 주세요.
revoke select on public.orgs from anon;
grant select (
  id, name, slug, vertical, currency, country, timezone, enabled_modules, logo_path,
  phone, email, address, bin_number, contact_name, homepage_url, item_keywords,
  is_active, created_at, updated_at,
  fax, contacts, company_intro, biz_name, ceo_name, biz_type, biz_item,
  seller_info_detail_enabled, seller_info_detail_html, seller_info_shop_enabled, seller_info_shop_html
) on public.orgs to anon;

select count(*) as 공급사_수 from public.orgs;
