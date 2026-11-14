import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const PAYMENT_STATUS = ['unpaid', 'paid', 'free'] as const
export const PAYMENT_LABEL: Record<(typeof PAYMENT_STATUS)[number], string> = {
  unpaid: '미결제',
  paid: '결제 완료',
  free: '무료(서비스)',
}
export const PLACEMENT_LABEL = { main: '전체 제품 첫 화면', category: '카테고리 페이지' } as const

/** 같은 자리·같은 기간에 함께 걸 수 있는 최대 개수 */
export const MAX_BANNERS_PER_SLOT = 5
export const MAX_PROMOTIONS_MAIN = 8
export const MAX_PROMOTIONS_PER_CATEGORY = 4

const period = {
  starts_on: z.string().regex(DATE_RE, '시작일을 선택하세요'),
  ends_on: z.string().regex(DATE_RE, '종료일을 선택하세요'),
}

export const bannerSchema = z
  .object({
    title: z.string().trim().min(1, '배너 이름을 입력하세요').max(100),
    advertiser_org_id: z.string().uuid().nullable(),
    advertiser_name: z.string().trim().max(100).optional(),
    link_url: z
      .string()
      .trim()
      .min(1, '연결 주소를 입력하세요')
      .max(500)
      .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), '/s/... 또는 https:// 로 시작하는 주소를 입력하세요'),
    image_pc: z.string().trim().min(1, 'PC 이미지를 선택하세요').max(1000),
    image_mobile: z.string().trim().max(1000).optional(),
    placement: z.enum(['main', 'category']),
    category_id: z.string().uuid().nullable(),
    ...period,
    sort_order: z.coerce.number().int().min(0).max(999),
    is_active: z.boolean(),
    payment_status: z.enum(PAYMENT_STATUS),
    price_won: z.coerce.number().int().min(0).max(100_000_000_000).nullable(),
    memo: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.ends_on >= v.starts_on, { message: '종료일은 시작일과 같거나 뒤여야 해요', path: ['ends_on'] })
  .refine((v) => v.placement !== 'category' || v.category_id, { message: '카테고리를 선택하세요', path: ['category_id'] })
export type BannerInput = z.infer<typeof bannerSchema>

export const promotionSchema = z
  .object({
    product_no: z.coerce.number().int().positive('상품번호를 입력하세요'),
    placement: z.enum(['main', 'category']),
    ...period,
    is_active: z.boolean(),
    payment_status: z.enum(PAYMENT_STATUS),
    price_won: z.coerce.number().int().min(0).max(100_000_000_000).nullable(),
    memo: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.ends_on >= v.starts_on, { message: '종료일은 시작일과 같거나 뒤여야 해요', path: ['ends_on'] })
export type PromotionInput = z.infer<typeof promotionSchema>

/** 날짜(서울 기준) → 저장용 시각 */
export function kstStart(date: string): string {
  return `${date}T00:00:00+09:00`
}
export function kstEnd(date: string): string {
  return `${date}T23:59:59+09:00`
}
/** 저장된 시각 → 날짜 입력칸 값 (서울 기준) */
export function toKstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
