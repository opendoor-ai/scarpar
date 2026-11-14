// 플랫폼 공통 카테고리(상품분류) 상세 설정 — 입력 규칙과 표시용 이름

import { z } from 'zod'

export const PRODUCT_SORTS = ['latest', 'oldest', 'name', 'price_asc', 'price_desc'] as const
export const PRODUCT_SORT_LABEL: Record<(typeof PRODUCT_SORTS)[number], string> = {
  latest: '최근 등록상품이 위로',
  oldest: '먼저 등록한 상품이 위로',
  name: '상품명 가나다순',
  price_asc: '낮은 가격순 (가격협의 상품이 앞에 와요)',
  price_desc: '높은 가격순',
}

export const categorySettingsSchema = z.object({
  name: z.string().trim().min(1, '분류명을 입력하세요').max(60),
  parent_id: z.string().uuid().nullable(),
  description: z.string().trim().max(500),
  is_visible: z.boolean(),
  show_on_main: z.boolean(),
  top_image: z.string().trim().max(1000),
  product_sort: z.enum(PRODUCT_SORTS),
  seo_title: z.string().trim().max(120),
  seo_description: z.string().trim().max(300),
  seo_keywords: z.string().trim().max(300),
})
export type CategorySettingsInput = z.infer<typeof categorySettingsSchema>

export const categoryOrderSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      parent_id: z.string().uuid().nullable(),
      sort_order: z.number().int().min(0).max(100000),
    }),
  )
  .max(2000)
export type CategoryOrderInput = z.infer<typeof categoryOrderSchema>
