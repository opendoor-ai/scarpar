import { z } from 'zod'

// Storefront zod schemas (docs/conventions.md — Server actions: "Validate with zod schema
// from src/modules/<key>/schemas.ts"). Consumed by src/modules/storefront/actions.ts and by
// client forms (react-hook-form + zodResolver) in src/components/store/**.

/** 한국 휴대폰: 010-1234-5678 / 01012345678 (하이픈·공백 허용). Name kept for existing imports. */
export const BD_PHONE_REGEX = /^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined))

const optionalEmail = z
  .string()
  .trim()
  .email('이메일 형식이 올바르지 않습니다')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : undefined))

export const contactSchema = z.object({
  name: z.string().trim().min(2, '이름을 입력하세요').max(120),
  phone: z
    .string()
    .trim()
    .regex(BD_PHONE_REGEX, '휴대폰 번호를 정확히 입력하세요 (예: 010-1234-5678)'),
  email: optionalEmail,
})

export const addressSchema = z.object({
  line1: z.string().trim().min(3, '주소를 입력하세요').max(300),
  area: optionalTrimmed(150),
  district: z.string().trim().min(2, '지역을 선택하세요'),
})

export const cartItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  qty: z.number().int().positive().max(999),
})
export type CartItemInput = z.infer<typeof cartItemInputSchema>

export const quoteDeliverySchema = z.object({
  orgSlug: z.string().min(1),
  district: z.string().trim().min(1, '지역을 선택하세요'),
})
export type QuoteDeliveryInput = z.infer<typeof quoteDeliverySchema>

export const applyDiscountSchema = z.object({
  orgSlug: z.string().min(1),
  code: z.string().trim().min(1, '할인 코드를 입력하세요').max(64),
  items: z.array(cartItemInputSchema).min(1),
})
export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>

export const paymentMethodSchema = z.enum(['cod', 'bkash', 'nagad'])

export const placeOrderSchema = z.object({
  orgSlug: z.string().min(1),
  contact: contactSchema,
  address: addressSchema,
  items: z.array(cartItemInputSchema).min(1, '장바구니가 비어 있습니다'),
  discountCode: optionalTrimmed(64),
  paymentMethod: paymentMethodSchema,
  /** Only used when paymentMethod === 'cod' and an advance is required. */
  advanceMfsProvider: z.enum(['bkash', 'nagad']).optional(),
  trxId: optionalTrimmed(64),
  senderNumber: optionalTrimmed(20),
  noteCustomer: optionalTrimmed(500),
})
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>

export const reviewSchema = z.object({
  orgSlug: z.string().min(1),
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  customerName: z.string().trim().min(2, '이름을 입력하세요').max(120),
  rating: z.number().int().min(1).max(5),
  title: optionalTrimmed(150),
  body: optionalTrimmed(2000),
})
export type ReviewInput = z.infer<typeof reviewSchema>

export const inquirySchema = z.object({
  orgSlug: z.string().min(1),
  productId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
  name: z.string().trim().min(2, '이름을 입력하세요').max(120),
  phone: optionalTrimmed(20),
  email: optionalEmail,
  message: z.string().trim().min(1, '문의 내용을 입력하세요').max(2000),
})
export type InquiryInput = z.infer<typeof inquirySchema>
