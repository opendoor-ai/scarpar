// 미니샵 홈 템플릿 — 버튼 한 번으로 기계 공급사에 맞는 블록 구성을 채워 넣습니다.
// 채운 뒤 글·사진만 바꾸고 "임시저장 → 게시하기" 하면 됩니다.

import { randomKey } from '@/lib/utils'
import type { CmsBlock } from '@/types/db'

export interface PageTemplate {
  id: string
  name: string
  description: string
  build: (orgName: string) => CmsBlock[]
}

const k = () => randomKey(8)

const INTRO_BODY = (orgName: string) =>
  `${orgName}은(는) 산업기계·중고기계 전문 공급사입니다.\n주력 기계와 강점, 보유 장비, A/S 범위 등을 여기에 적어 주세요.`

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'basic',
    name: '기본형',
    description: '대표 이미지 → 최신 제품 → 회사 소개 → 전화 문의',
    build: (orgName) => [
      {
        _key: k(),
        _type: 'hero',
        heading: `${orgName}에 오신 것을 환영합니다`,
        subheading: '산업기계·중고기계, 상담부터 설치까지 책임집니다.',
        ctaLabel: '전체 제품 보기',
        ctaHref: '/products',
      },
      { _key: k(), _type: 'productGrid', title: '최신 등록 제품', mode: 'latest', limit: 8 },
      {
        _key: k(),
        _type: 'companyIntro',
        heading: '회사 소개',
        body: INTRO_BODY(orgName),
        stats: [
          { label: '설립', value: '0000년' },
          { label: '보유 장비', value: '00대' },
          { label: '거래처', value: '000곳' },
        ],
        showContact: true,
      },
      {
        _key: k(),
        _type: 'inquiryCta',
        heading: '필요한 기계, 전화 한 통으로 상담하세요',
        body: '제품 사양·가격·납기 모두 친절하게 안내해 드립니다.',
        showSms: true,
      },
    ],
  },
  {
    id: 'products',
    name: '제품 중심형',
    description: '추천 제품 → 전화 문의 → 최신 제품 (제품이 많은 공급사용)',
    build: () => [
      { _key: k(), _type: 'productGrid', title: '추천 제품', mode: 'featured', limit: 8 },
      {
        _key: k(),
        _type: 'inquiryCta',
        heading: '찾는 기계가 없나요? 바로 문의하세요',
        body: '목록에 없는 기계도 수배해 드립니다.',
        showSms: true,
      },
      { _key: k(), _type: 'productGrid', title: '최신 등록 제품', mode: 'latest', limit: 12 },
    ],
  },
  {
    id: 'company',
    name: '회사 소개형',
    description: '대표 이미지 → 회사 소개 → 제품 → 자주 묻는 질문 → 전화 문의',
    build: (orgName) => [
      {
        _key: k(),
        _type: 'hero',
        heading: orgName,
        subheading: '믿을 수 있는 기계 전문 기업',
        ctaLabel: '제품 보기',
        ctaHref: '/products',
      },
      {
        _key: k(),
        _type: 'companyIntro',
        heading: '우리 회사는요',
        body: INTRO_BODY(orgName),
        stats: [
          { label: '업력', value: '00년' },
          { label: '누적 납품', value: '000대' },
        ],
        showContact: true,
      },
      { _key: k(), _type: 'productGrid', title: '주요 제품', mode: 'latest', limit: 8 },
      {
        _key: k(),
        _type: 'faq',
        items: [
          { q: '설치와 시운전도 해 주나요?', a: '네, 지역과 기계에 따라 설치·시운전을 지원합니다. 문의 주세요.' },
          { q: '중고 기계도 A/S가 되나요?', a: '기계 상태에 따라 보증 기간과 A/S 범위를 안내해 드립니다.' },
          { q: '견적은 어떻게 받나요?', a: '전화나 문자로 원하는 기계와 사양을 알려 주시면 빠르게 견적을 드립니다.' },
        ],
      },
      {
        _key: k(),
        _type: 'inquiryCta',
        heading: '견적·상담 문의',
        body: '평일 오전 9시 ~ 오후 6시, 친절하게 안내해 드립니다.',
        showSms: true,
      },
    ],
  },
]
