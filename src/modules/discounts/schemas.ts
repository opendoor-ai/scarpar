import { z } from 'zod'

export const DISCOUNT_TYPES = ['percent', 'fixed', 'free_shipping'] as const
export const DISCOUNT_SCOPES = ['all', 'products', 'categories'] as const

const codeRegex = /^[A-Za-z0-9_-]*$/

export const discountFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    code: z
      .string()
      .trim()
      .max(40, 'Max 40 characters')
      .regex(codeRegex, 'Letters, numbers, - and _ only')
      .optional()
      .or(z.literal('')),
    type: z.enum(DISCOUNT_TYPES),
    // Meaning depends on `type`: percent -> plain 1-100 integer, fixed -> taka
    // amount (converted to paisa server-side), free_shipping -> unused.
    value: z.coerce.number().optional(),
    scope: z.enum(DISCOUNT_SCOPES),
    // No `.default()` on the fields below: zodResolver's input/output types
    // diverge for defaulted fields under @hookform/resolvers v5 when combined
    // with useForm<InferredType>. The form always supplies a concrete value
    // (see discount-form.tsx defaultValues), so plain required types work.
    product_ids: z.array(z.string().uuid()),
    category_ids: z.array(z.string().uuid()),
    // Taka, converted to paisa server-side. Empty input coerces to 0, which
    // correctly means "no minimum".
    min_order: z.coerce.number().min(0, 'Cannot be negative'),
    max_uses: z.coerce.number().int().positive('0보다 큰 숫자를 입력하세요').optional(),
    starts_at: z.string().optional().or(z.literal('')),
    expires_at: z.string().optional().or(z.literal('')),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'percent') {
      if (data.value === undefined || data.value < 1 || data.value > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: '1~100 사이 값을 입력하세요' })
      }
    }
    if (data.type === 'fixed') {
      if (data.value === undefined || data.value <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: '0보다 큰 금액을 입력하세요' })
      }
    }
    if (data.scope === 'products' && data.product_ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['product_ids'], message: '상품을 1개 이상 선택하세요' })
    }
    if (data.scope === 'categories' && data.category_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category_ids'],
        message: '카테고리를 1개 이상 선택하세요',
      })
    }
    if (data.starts_at && data.expires_at) {
      const start = new Date(data.starts_at).getTime()
      const end = new Date(data.expires_at).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expires_at'], message: '시작일 이후여야 합니다' })
      }
    }
  })

export type DiscountFormInput = z.infer<typeof discountFormSchema>
