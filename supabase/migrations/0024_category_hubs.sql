-- 0024: 카테고리·검색 허브 (프리미엄·스페셜·멤버스) + 메인 허브 안내 정리
-- - 배너에 "노출할 분류 번호", "검색 결과에도 보이기", "검색어" 칸 추가
-- 여러 번 실행해도 안전합니다.

alter table public.banner_ads add column if not exists target_cate_nos int[] not null default '{}';  -- 이 분류(와 그 아래 2차) 페이지에 보임
alter table public.banner_ads add column if not exists show_in_search boolean not null default false; -- 검색 결과에도 보임
alter table public.banner_ads add column if not exists search_keywords text;                         -- 검색어 (쉼표로 구분)

insert into public.banner_groups (code, name, kind, guide, is_builtin, sort_order) values
  ('premium_hub', '[분류·검색] 프리미엄 허브', 'hub',
'카테고리 페이지 맨 위의 큰 홍보 카드예요. (한 줄에 2개)
이미지 = 대표 사진 (가로 800×500 권장) · HTML 칸에 유튜브 퍼가기 코드를 넣으면 영상으로 보여요
텍스트1 = 회사명 · 텍스트2 = 큰 제목 · 텍스트3 = 설명 · 텍스트4 = 전화번호
링크 = 미니샵·홈페이지 주소 · 색상1 = 카드 배경색 · 색상2 = 글자색
노출 분류 번호 = 이 번호의 분류에서만 보임 (0 = 전체 카테고리, 여러 개는 쉼표: 0, 1, 11) · 검색에도 보이기 + 검색어', true, 200),
  ('special_hub', '[분류·검색] 스페셜 허브', 'hub',
'색 카드에 회사 정보와 대표 제품 2개를 함께 보여줘요.
이미지 = 왼쪽 썸네일 (정사각형 400×400)
텍스트1 = 회사명 (작은 글씨) · 텍스트2 = 큰 제목 · 텍스트3 = 취급 품목 · 텍스트4 = 전화번호
링크 = "미니샵 바로가기" 버튼 주소 · 상품 = 오른쪽에 함께 보여줄 제품 (최대 2개)
색상1 = 카드 배경색 · 색상2 = 글자색 · 색상4 = 버튼 색
노출 분류 번호 / 검색에도 보이기 + 검색어', true, 210),
  ('members_hub', '[분류·검색] 멤버스 허브', 'hub',
'회사 카드 + 대표 제품 4개 묶음이에요.
이미지 = 회사 썸네일 (정사각형) · 텍스트1 = 회사명 · 텍스트2 = 한 줄 소개 · 텍스트3 = 전화번호 · 텍스트4 = 설명
링크 = 미니샵 주소 · 상품 = 함께 보여줄 제품 (최대 4개)
색상1 = 카드 배경색 · 색상2 = 회사명 색 · 색상4 = 전화번호 색
노출 분류 번호 / 검색에도 보이기 + 검색어', true, 220)
on conflict (code) do nothing;

-- 메인 허브 안내 (화면이 쓰는 칸)
update public.banner_groups set guide =
'4칸 카드예요. 이미지 = 정사각형 400×400
텍스트1 = 회사명 (색상1) · 텍스트2 = 설명 (색상2) · 텍스트3 = "신품" 또는 "중고" (배지로 표시)
링크 = 누르면 갈 주소' where code = 'smart';
update public.banner_groups set guide =
'세로 카드 4칸이에요. 이미지 = 300×367
텍스트1 = 회사명 (색상1) · 텍스트2 = 설명 (색상2) · 텍스트3 = 전화번호 등 (색상3) · 텍스트4 = "신품" 또는 "중고"
링크 = 누르면 갈 주소 · 상품 = 카드 아래 작은 제품 (최대 3개, 선택)' where code = 'partner';
update public.banner_groups set guide =
'가로로 긴 띠 광고예요. 이미지 = PC 1400×180 / 모바일 750×300
텍스트1 = 큰 문구 (두 줄 가능, 색상1) · 텍스트2 = 회사명·전화번호 (색상2)
링크 = 누르면 갈 주소 · 글자 없이 이미지만 써도 돼요' where code = 'wide';
update public.banner_groups set guide =
'두 칸씩 나란히 보이는 가로 광고예요. 이미지 = 685×180
텍스트1 = 회사명·전화번호 (색상1) · 텍스트2 = 설명 (두 줄 가능, 색상2)
링크 = 누르면 갈 주소' where code = 'plus';

select code, name from public.banner_groups where code in ('premium_hub', 'special_hub', 'members_hub');
