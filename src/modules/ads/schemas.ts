import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const PAYMENT_STATUS = ['unpaid', 'paid', 'free'] as const
export const PAYMENT_LABEL: Record<(typeof PAYMENT_STATUS)[number], string> = {
  unpaid: '미결제',
  paid: '결제 완료',
  free: '무료(서비스)',
}
export const PLACEMENT_LABEL = { main: '전체 제품 첫 화면', category: '카테고리 페이지' } as const

/** 배너 광고 자리 (메인 화면 위에서부터 순서) */
export const BANNER_PLACEMENTS = [
  'main',
  'smart',
  'wide',
  'partner',
  'plus',
  'image',
  'wing_left',
  'wing_right',
  'category',
] as const
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]
export const BANNER_PLACEMENT_INFO: Record<BannerPlacement, { label: string; size: string; max: number; hint: string }> = {
  main: { label: '메인 배너 (맨 위 슬라이드)', size: '800×600 (4:3)', max: 12, hint: '3장씩 나란히 넘어가요. 회사명·전화번호가 이미지 위에 표시돼요.' },
  smart: { label: '스마트 허브 (4칸 카드)', size: '600×600 (정사각형)', max: 8, hint: '"홈페이지 바로가기" 버튼이 붙은 공급사 카드예요.' },
  wide: { label: '와이드 허브 (가로 띠)', size: '1200×200', max: 3, hint: '화면 너비 전체를 쓰는 가로 광고예요.' },
  partner: { label: '파트너 허브 (공급사+제품)', size: '600×400', max: 8, hint: '광고주 공급사를 고르면 그 공급사의 최신 제품 3개가 함께 보여요.' },
  plus: { label: '플러스 허브 (2칸 가로)', size: '800×300', max: 6, hint: '두 칸씩 나란히 보이는 가로 광고예요.' },
  image: { label: '큰 이미지 광고 (세로)', size: '1000×1000 이상 (세로로 긴 이미지 가능)', max: 6, hint: '공급사 홍보 이미지를 크게 보여줘요.' },
  wing_left: { label: '왼쪽 날개 배너', size: '160×600', max: 4, hint: '넓은 PC 화면 왼쪽에 붙어 따라다녀요. (휴대폰에선 안 보여요)' },
  wing_right: { label: '오른쪽 날개 배너', size: '160×600', max: 4, hint: '넓은 PC 화면 오른쪽에 붙어 따라다녀요. (휴대폰에선 안 보여요)' },
  category: { label: '카테고리 페이지 배너', size: '1200×300', max: 5, hint: '고른 카테고리(와 그 2차) 제품 목록 위에 보여요.' },
}

/** 같은 자리·같은 기간에 함께 걸 수 있는 최대 개수 */
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
      .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), '/minishop/... 또는 https:// 로 시작하는 주소를 입력하세요'),
    image_pc: z.string().trim().min(1, 'PC 이미지를 선택하세요').max(1000),
    image_mobile: z.string().trim().max(1000).optional(),
    placement: z.enum(BANNER_PLACEMENTS),
    category_id: z.string().uuid().nullable(),
    subtitle: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
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
