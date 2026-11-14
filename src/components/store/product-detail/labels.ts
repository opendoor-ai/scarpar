import type { ProductCondition } from '@/types/db'

export const CONDITION_LABEL: Record<ProductCondition, string> = {
  new: '신품',
  used: '중고',
  refurbished: '리퍼',
}

export const CONDITION_BADGE_CLASS: Record<ProductCondition, string> = {
  new: 'bg-indigo-700 text-white',
  used: 'bg-red-600 text-white',
  refurbished: 'bg-emerald-600 text-white',
}

/** 대표이미지 아이콘 (상품 등록 → 아이콘 설정) */
export const PRODUCT_BADGES = ['direct', 'urgent', 'special', 'rental', 'install', 'best'] as const
export type ProductBadge = (typeof PRODUCT_BADGES)[number]
export const BADGE_LABEL: Record<ProductBadge, string> = {
  direct: '직접거래',
  urgent: '급매',
  special: '특가',
  rental: '렌탈가능',
  install: '설치·A/S',
  best: '추천',
}
export const BADGE_CLASS: Record<ProductBadge, string> = {
  direct: 'bg-red-600 text-white',
  urgent: 'bg-orange-500 text-white',
  special: 'bg-pink-600 text-white',
  rental: 'bg-teal-600 text-white',
  install: 'bg-green-600 text-white',
  best: 'bg-sky-600 text-white',
}
export function isProductBadge(v: string): v is ProductBadge {
  return (PRODUCT_BADGES as readonly string[]).includes(v)
}

/** 상품코드 표시 형식: P10001 */
export function productCode(productNo: number | null | undefined): string | null {
  return productNo ? `P${productNo}` : null
}
