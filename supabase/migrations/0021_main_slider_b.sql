-- 0021: [메인] 슬라이드 (B타입) — 화면 가득 채우는 큰 슬라이드 (이미지·글자 위치·버튼·영상)
-- 어떤 타입을 쓸지는 관리자 → 사이트 설정 → "메인 슬라이드 형태"에서 고릅니다.
-- 여러 번 실행해도 안전합니다.

insert into public.banner_groups (code, name, kind, guide, is_builtin, sort_order) values (
  'main_b',
  '[메인] 슬라이드 (B타입)',
  'main',
  '화면 너비를 가득 채우는 큰 슬라이드예요. 이미지: PC 2550×800 / 모바일 720×800
텍스트1 = 글자 위치. 가로-세로 순서로 적어요: left-top, left-center, left-bottom, center-top, center, center-bottom, right-top, right-center, right-bottom
   PC와 모바일을 따로 정하려면 "left-center | center-bottom" 처럼 | 로 나눠요. 글자 없이 이미지만 쓰려면 none
텍스트2 = 제목 (색상1), 텍스트3 = 설명 (색상2), 텍스트4 = 버튼 글자 (색상3 = 버튼 글자색, 색상4 = 버튼 배경색), 링크 = 버튼·이미지를 누르면 갈 주소
영상: HTML 칸에 유튜브·비메오 퍼가기 코드(iframe)나 video 태그를 넣으면 영상으로 보여요. 이때 텍스트2에 화면 비율(예: 16/9)을 적어요.',
  true,
  101
)
on conflict (code) do nothing;

select code, name from public.banner_groups where code in ('main', 'main_b');
