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
  name: z.string().trim().min(1, 'Name is required').max(200, 'Too long'),
  phone: z.string().trim().max(32, 'Too long').optional().nullable(),
  email: z
    .union([z.string().trim().email('이메일 형식이 올바르지 않습니다'), z.literal('')])
    .optional()
    .nullable(),
  address: z.string().trim().max(500, 'Too long').optional().nullable(),
  bin_number: z
    .union([z.string().trim().regex(/^\d{13}$/, 'Must be exactly 13 digits'), z.literal('')])
    .optional()
    .nullable(),
  timezone: z.string().trim().min(1, 'Timezone is required'),
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
