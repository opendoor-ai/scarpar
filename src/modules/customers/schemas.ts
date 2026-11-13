import { z } from 'zod'

const phoneRegex = /^[0-9+\-\s()]{6,20}$/

const addressSubSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal('')),
  recipient: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  line1: z.string().trim().max(200).optional().or(z.literal('')),
  area: z.string().trim().max(120).optional().or(z.literal('')),
  district: z.string().trim().max(60).optional().or(z.literal('')),
  postcode: z.string().trim().max(20).optional().or(z.literal('')),
})

/** New-customer dialog: name/phone/email + an optional first address. */
export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number'),
  email: z.string().trim().email('이메일 형식이 올바르지 않습니다').optional().or(z.literal('')),
  address: addressSubSchema.optional(),
})
export type CustomerFormInput = z.infer<typeof customerFormSchema>

/** Edit-customer dialog: same core fields, no address (addresses have their own CRUD). */
export const customerEditSchema = customerFormSchema.omit({ address: true })
export type CustomerEditInput = z.infer<typeof customerEditSchema>

export const addressFormSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal('')),
  recipient: z.string().trim().min(1, 'Recipient name is required').max(120),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number'),
  line1: z.string().trim().min(1, 'Address line is required').max(200),
  area: z.string().trim().max(120).optional().or(z.literal('')),
  district: z.string().trim().min(1, 'District is required').max(60),
  postcode: z.string().trim().max(20).optional().or(z.literal('')),
  // No `.default()`: zodResolver's input/output types diverge for defaulted
  // fields under @hookform/resolvers v5 when combined with useForm<InferredType>.
  // The form always supplies a concrete value, so a plain required boolean works.
  is_default: z.boolean(),
})
export type AddressFormInput = z.infer<typeof addressFormSchema>

export const blocklistEntrySchema = z.object({
  kind: z.enum(['phone', 'address', 'ip']),
  value: z.string().trim().min(1, 'Value is required').max(200),
  reason: z.string().trim().max(300).optional().or(z.literal('')),
})
export type BlocklistEntryInput = z.infer<typeof blocklistEntrySchema>
