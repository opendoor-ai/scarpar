-- 0019: 배포 전 기본 데이터 — 지금 운영 중인 jadong.co.kr 화면에 공개된 정보를 그대로 옮깁니다.
-- 1) 사이트 설정: 바닥글 사업자 정보·고객센터 (사이트 설정 화면에서 언제든 수정 가능)
-- 2) 1차 카테고리 메인 아이콘 이미지 (jadong.co.kr 카테고리 동그라미 이미지)
--    ※ 이미지는 지금 카페24 서버에 있는 주소를 그대로 씁니다. 카페24를 해지하기 전에
--      상품분류 관리에서 이미지를 새로 올려 바꿔 주세요.
-- 여러 번 실행해도 안전합니다. (이미 입력한 값이 있으면 덮어씁니다)

-- 1) 사이트 설정 ------------------------------------------------------------------
insert into public.site_settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

update public.site_settings
set data = data || jsonb_build_object(
      'notice_enabled', true,
      'notice_text', '공급사 모집중! 지금 신청하세요',
      'notice_link_label', '무료제품등록',
      'notice_url', '/signup',
      'company_name', '전자동',
      'ceo', '한상덕',
      'business_no', '156-59-00878',
      'mail_order_no', '제2026-서울금천-1813호',
      'address', '(08511) 서울 금천구 벚꽃로36길 30 가산 KS TOWER 제412호',
      'phone', '1899-8055',
      'email', 'cs@jeonjadong.com',
      'privacy_officer', '한상덕 (cs@jeonjadong.com)',
      'cs_hours', '평일 09:00 ~ 17:30 (점심 12:00 ~ 13:00, 주말·공휴일 휴무)'
    ),
    updated_at = now()
where id = 1;

-- 2) 카테고리 아이콘 ----------------------------------------------------------------
with platform as (
  select id from public.orgs where slug = 'jadong'
), icons(slug, url) as (
  values
    ('machine-tools',            'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/07cca17b4ce349d8dcc0f83dc76285c4.webp'),
    ('automation-fa-robot',      'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/02d34a2e3a07ee0b786db4b41a3893fe.webp'),
    ('packaging-logistics',      'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/b929e0626e1908d466e46cfd0c838462.webp'),
    ('food-pharma-cosmetic',     'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/bd289c6e304e0e360725ad98b4f89653.webp'),
    ('plastic-mold-injection',   'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/c8b6e414a5c363156ca9d915aadde076.webp'),
    ('pneumatic-hvac-energy',    'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/a937100a10b8bfe5f5c970cd52f7d46d.webp'),
    ('electrical-electronics',   'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/8b56c0f93a7f3a68eb7ab710a1cca3ad.webp'),
    ('environment-construction', 'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/4e02caede0fc81d6e00e3219fb97a29a.webp'),
    ('etc-used-service',         'https://ecimg.cafe24img.com/pg2025b53032269044/opendoorai/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/3444e89b4cb54286aab5d2c68157d3d3.webp')
)
update public.categories c
set icon_image = i.url, updated_at = now()
from icons i, platform p
where c.org_id = p.id and c.slug = i.slug and c.parent_id is null;

-- 확인용
select c.cate_no, c.name, (c.icon_image is not null) as 아이콘
from public.categories c join public.orgs o on o.id = c.org_id
where o.slug = 'jadong' and c.parent_id is null
order by c.sort_order;
