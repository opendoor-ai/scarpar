// 플랫폼(사이트) 공통 정보. 값은 .env 에서 바꿀 수 있고, 없으면 기본값을 씁니다.
//   NEXT_PUBLIC_SITE_NAME              사이트 이름 (기본: 전자동기계광고)
//   NEXT_PUBLIC_NAVER_SITE_VERIFICATION  네이버 서치어드바이저 사이트 확인 코드
//   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 구글 서치콘솔 사이트 확인 코드

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '전자동기계광고'
export const SITE_DESCRIPTION = '산업기계·중고기계 공급사와 제품 정보를 한곳에서 — 공급사에 바로 전화·문자 문의'

export const NAVER_SITE_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || ''
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || ''
