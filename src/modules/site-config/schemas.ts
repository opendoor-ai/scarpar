// 사이트 운영 설정 (메인 관리자) — SEO·AEO / 상품검색 / 상품정보표시 / 바로가기(홈 화면 앱)
// site_settings.data 안에 seo·search·display·app 이름으로 함께 저장해요. (화면·서버 모두에서 씀)

import { z } from 'zod'

const s = (max: number) => z.string().trim().max(max)

// ---------------------------------------------------------------------------
// 검색엔진 최적화(SEO) + AI 답변 엔진 최적화(AEO)
// ---------------------------------------------------------------------------

/** 검색로봇 (일반 검색엔진 + AI 검색) */
export const CRAWLERS = [
  { key: 'Googlebot', label: '구글', group: 'search' },
  { key: 'Yeti', label: '네이버', group: 'search' },
  { key: 'Daumoa', label: '다음(카카오)', group: 'search' },
  { key: 'Bingbot', label: '빙(MS)', group: 'search' },
  { key: 'GPTBot', label: 'ChatGPT 학습', group: 'ai' },
  { key: 'OAI-SearchBot', label: 'ChatGPT 검색', group: 'ai' },
  { key: 'ChatGPT-User', label: 'ChatGPT 사용자 요청', group: 'ai' },
  { key: 'ClaudeBot', label: 'Claude 학습', group: 'ai' },
  { key: 'Claude-SearchBot', label: 'Claude 검색', group: 'ai' },
  { key: 'PerplexityBot', label: 'Perplexity', group: 'ai' },
  { key: 'Google-Extended', label: 'Google Gemini', group: 'ai' },
  { key: 'Applebot-Extended', label: 'Apple AI', group: 'ai' },
  { key: 'Bytespider', label: '틱톡(ByteDance)', group: 'ai' },
] as const
export type CrawlerKey = (typeof CRAWLERS)[number]['key']

export const SEO_VARIABLES = {
  common: ['{사이트명}'],
  product: ['{상품명}', '{모델명}', '{제조사}', '{분류}', '{공급사}', '{판매가}', '{요약}', '{상품코드}', '{사이트명}'],
  category: ['{분류명}', '{상위분류명}', '{상품수}', '{사이트명}'],
  minishop: ['{공급사}', '{취급품목}', '{주소}', '{사이트명}'],
}

export const seoSchema = z.object({
  title: s(70),
  description: s(200),
  keywords: s(300),
  favicon: s(300),
  ogImage: s(300),
  // 검색엔진 사이트 소유 확인
  googleVerification: s(120),
  naverVerification: s(120),
  bingVerification: s(120),
  daumPin: s(200),
  // 네이버 연관채널 · SNS (한 줄에 하나)
  channels: s(2000),
  // 방문 분석
  ga4Id: s(30),
  naverAnalyticsId: s(40),
  // 검색로봇 접근
  blockedCrawlers: z.array(z.string().max(40)).max(30),
  extraDisallow: s(1000),
  // 페이지별 SEO 문구 틀 (변수 사용)
  productTitle: s(150),
  productDescription: s(300),
  categoryTitle: s(150),
  categoryDescription: s(300),
  minishopTitle: s(150),
  minishopDescription: s(300),
  // AEO — AI가 이해하기 쉬운 사이트 소개와 자주 묻는 질문
  aiSummary: s(2000),
  faq: z.array(z.object({ q: s(200), a: s(1500) })).max(30),
})
export type SeoSettings = z.infer<typeof seoSchema>

export const DEFAULT_SEO: SeoSettings = {
  title: '전자동기계광고 | 산업기계 중고기계 매매 직거래·광고 플랫폼',
  description:
    '전자동기계광고는 산업기계·중고기계 매매 전문 직거래 플랫폼입니다. 고소작업대, 중고CNC선반, 중고머시닝센터, 콤프레샤, 절곡기, 레이저용접기, 중고포장기계, 중고식품기계 등 다양한 기계 공급사에 바로 전화·문자로 문의하세요.',
  keywords: '중고기계, 산업기계, 중고기계매매, 기계직거래, 중고CNC선반, 중고머시닝센터, 고소작업대, 콤프레샤, 포장기계, 식품기계',
  favicon: '',
  ogImage: '',
  googleVerification: '',
  naverVerification: '',
  bingVerification: '',
  daumPin: '',
  channels: '',
  ga4Id: '',
  naverAnalyticsId: '',
  blockedCrawlers: ['Bytespider'],
  extraDisallow: '',
  productTitle: '{상품명} {모델명} | {공급사}',
  productDescription: '{상품명} {모델명} {제조사} — {요약} {공급사}에 전화·문자로 바로 문의하세요. ({분류})',
  categoryTitle: '{분류명} 중고·신품 매매 직거래',
  categoryDescription: '{분류명} 중고·신품 기계 {상품수}개를 비교하고 공급사에 바로 문의하세요. {사이트명}',
  minishopTitle: '{공급사} 미니샵',
  minishopDescription: '{공급사} — {취급품목} 제품을 확인하고 전화·문자로 바로 문의하세요. {주소}',
  aiSummary: '',
  faq: [],
}

// ---------------------------------------------------------------------------
// 상품검색 설정
// ---------------------------------------------------------------------------
export const SEARCH_FIELDS = [
  { key: 'code', label: '상품코드' },
  { key: 'name', label: '상품명' },
  { key: 'model', label: '모델명' },
  { key: 'brand', label: '제조사' },
  { key: 'spec', label: '제품사양' },
  { key: 'summary', label: '요약설명' },
] as const
export type SearchField = (typeof SEARCH_FIELDS)[number]['key']

export const searchSchema = z.object({
  fields: z.array(z.enum(['code', 'name', 'model', 'brand', 'spec', 'summary'])).min(1, '검색할 항목을 하나 이상 고르세요'),
  popular: s(500),
  promoEnabled: z.boolean(),
  promoMode: z.enum(['random', 'order']),
  promos: z.array(z.object({ text: s(40), url: s(500) })).max(50),
})
export type SearchSettings = z.infer<typeof searchSchema>

export const DEFAULT_SEARCH: SearchSettings = {
  fields: ['code', 'name', 'model', 'brand'],
  popular: '',
  promoEnabled: false,
  promoMode: 'random',
  promos: [],
}

// ---------------------------------------------------------------------------
// 상품정보표시 설정
// ---------------------------------------------------------------------------
export const CARD_FIELDS = [
  { key: 'badges', label: '아이콘 (직접거래·급매 등)' },
  { key: 'condition', label: '상품상태 (신품·중고)' },
  { key: 'model', label: '모델명' },
  { key: 'supplier', label: '공급사' },
  { key: 'price', label: '판매가' },
] as const
export const DETAIL_FIELDS = [
  { key: 'code', label: '상품코드' },
  { key: 'category', label: '제품분류' },
  { key: 'model', label: '모델명' },
  { key: 'spec', label: '제품사양' },
  { key: 'brand', label: '제조사' },
  { key: 'year', label: '연식' },
  { key: 'origin', label: '원산지' },
  { key: 'price', label: '판매가' },
  { key: 'supplier', label: '공급사' },
  { key: 'phone', label: '연락처' },
] as const
export type CardField = (typeof CARD_FIELDS)[number]['key']
export type DetailField = (typeof DETAIL_FIELDS)[number]['key']

const fieldSetting = z.object({ show: z.boolean(), label: s(20) })
export const displaySchema = z.object({
  card: z.record(z.string(), fieldSetting),
  detail: z.record(z.string(), fieldSetting),
})
export type DisplaySettings = z.infer<typeof displaySchema>

export const DEFAULT_DISPLAY: DisplaySettings = {
  card: Object.fromEntries(CARD_FIELDS.map((f) => [f.key, { show: true, label: '' }])),
  detail: Object.fromEntries(DETAIL_FIELDS.map((f) => [f.key, { show: true, label: f.label }])),
}

// ---------------------------------------------------------------------------
// 바로가기 (휴대폰 홈 화면에 앱처럼 추가)
// ---------------------------------------------------------------------------
export const appSchema = z.object({
  enabled: z.boolean(),
  shortName: s(12),
  name: s(40),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '색상을 다시 고르세요'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '색상을 다시 고르세요'),
  display: z.enum(['standalone', 'browser']),
  icon: s(300),
})
export type AppSettings = z.infer<typeof appSchema>

export const DEFAULT_APP: AppSettings = {
  enabled: true,
  shortName: '전자동기계광고',
  name: '전자동기계광고',
  themeColor: '#2f5d46',
  backgroundColor: '#ffffff',
  display: 'standalone',
  icon: '',
}

export interface SiteConfig {
  seo: SeoSettings
  search: SearchSettings
  display: DisplaySettings
  app: AppSettings
}

/** "{상품명} | {공급사}" 같은 문구 틀에 값 채우기 (빈 변수는 지우고 공백·구분자 정리) */
export function fillTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template
    .replace(/\{([^}]+)\}/g, (_, k: string) => {
      const v = vars[k]
      return v === null || v === undefined ? '' : String(v)
    })
    .replace(/\(\s*\)/g, '')
    .replace(/\s*\|\s*(\|\s*)+/g, ' | ')
    .replace(/^\s*[|—-]\s*|\s*[|—-]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
