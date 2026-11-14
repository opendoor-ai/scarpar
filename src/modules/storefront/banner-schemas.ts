import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === '' || DATE_RE.test(v), '날짜를 확인하세요')

export const storeBannerSchema = z
  .object({
    title: z.string().trim().min(1, '배너 이름을 입력하세요').max(100),
    link_url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), '/s/... 또는 https:// 로 시작하는 주소를 입력하세요'),
    image_pc: z.string().trim().min(1, 'PC 이미지를 선택하세요').max(1000),
    image_mobile: z.string().trim().max(1000),
    starts_on: optionalDate,
    ends_on: optionalDate,
    sort_order: z.coerce.number().int().min(0).max(999),
    is_active: z.boolean(),
  })
  .refine((v) => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, {
    message: '종료일은 시작일과 같거나 뒤여야 해요',
    path: ['ends_on'],
  })
export type StoreBannerInput = z.infer<typeof storeBannerSchema>
