import { z } from 'zod'

// Mirrors ModuleKey (src/modules/types.ts) — duplicated as a runtime zod enum
// the same way src/lib/status.ts duplicates DB enums locally; keep in sync.
export const MODULE_KEY_VALUES = [
  'catalog',
  'orders',
  'pos',
  'customers',
  'discounts',
  'delivery',
  'receipts',
  'cms',
  'storefront',
  'reports',
  'expenses',
  'reviews',
  'courses',
  'services',
  'listings',
] as const

export const orgProfileSchema = z.object({
  name: z.string().trim().min(1, '회사명을 입력하세요').max(200, '너무 깁니다'),
  phone: z.string().trim().max(32, '너무 깁니다').optional().nullable(),
  email: z
    .union([z.string().trim().email('이메일 형식이 올바르지 않습니다'), z.literal('')])
    .optional()
    .nullable(),
  address: z.string().trim().max(500, '너무 깁니다').optional().nullable(),
  bin_number: z
    .union([z.string().trim().regex(/^\d{3}-?\d{2}-?\d{5}$/, '사업자등록번호 10자리를 입력하세요 (예: 123-45-67890)'), z.literal('')])
    .optional()
    .nullable(),
  contact_name: z.string().trim().max(100, '너무 깁니다').optional().nullable(),
  homepage_url: z
    .union([z.string().trim().url('https://로 시작하는 주소를 입력하세요').max(300), z.literal('')])
    .optional()
    .nullable(),
  /** 쉼표로 구분 — 액션에서 text[]로 변환 */
  item_keywords: z.string().trim().max(500, '너무 깁니다').optional().nullable(),
  timezone: z.string().trim().min(1, '시간대를 선택하세요'),
  enabled_modules: z.array(z.enum(MODULE_KEY_VALUES)),
})

export type OrgProfileInput = z.infer<typeof orgProfileSchema>

export const settingEntrySchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
})

export const updateSettingsSchema = z.object({
  entries: z.array(settingEntrySchema).min(1, 'Nothing to save'),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
