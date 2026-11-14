import type { ProductCondition } from '@/types/db'

export const CONDITION_LABEL: Record<ProductCondition, string> = {
  new: '신품',
  used: '중고',
  refurbished: '리퍼',
}

export const CONDITION_BADGE_CLASS: Record<ProductCondition, string> = {
  new: 'bg-blue-600 text-white',
  used: 'bg-amber-500 text-white',
  refurbished: 'bg-emerald-600 text-white',
}

/** 상품코드 표시 형식: P10001 */
export function productCode(productNo: number | null | undefined): string | null {
  return productNo ? `P${productNo}` : null
}
