// 자주 묻는 질문 기본값 (관리자 → SEO → FAQ를 적지 않았을 때) + FAQPage 구조화 데이터

import { SITE_NAME } from '@/lib/site'

export const DEFAULT_FAQ: { q: string; a: string }[] = [
  {
    q: '제품은 어떻게 사나요?',
    a: `${SITE_NAME}는 공급사와 고객을 연결하는 광고 플랫폼이에요. 제품 상세페이지의 전화·문자 버튼으로 공급사에 직접 문의하고, 가격·납기·설치는 공급사와 협의해 주세요.`,
  },
  {
    q: '가격이 "가격협의"로 나와요.',
    a: '중고·주문제작 기계는 상태와 옵션에 따라 가격이 달라서 공급사가 상담 후 안내해요. 전화나 문자로 문의해 주세요.',
  },
  {
    q: '공급사로 입점하려면 어떻게 하나요?',
    a: '"공급사등록신청"에서 회원가입 후 입점 신청서를 내면, 확인 후 미니샵과 관리자 화면이 열려요. 제품 등록은 무료예요.',
  },
  {
    q: '광고는 어떻게 하나요?',
    a: '"광고상품" 페이지에서 광고 자리를 확인하고 고객센터로 연락 주세요. 남은 자리와 기간을 안내해 드려요.',
  },
  {
    q: '거래 중 문제가 생겼어요.',
    a: '거래 당사자는 고객과 공급사예요. 먼저 공급사와 협의해 주시고, 해결이 어려우면 고객센터로 알려 주세요. 사실 확인 후 공급사 안내·조치를 도와드려요.',
  },
]


/** 검색엔진·AI용 FAQPage JSON-LD (</script> 깨짐 방지 이스케이프) */
export function faqJsonLd(list: { q: string; a: string }[]): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return safeJsonLd(data)
}

/** JSON-LD 문자열 — 데이터 안의 < > & 가 <script> 태그를 깨지 않게 바꿔요 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&]/g, (c) => '\\u00' + c.charCodeAt(0).toString(16))
}
