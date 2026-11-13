// Zod schemas for the delivery module (docs/conventions.md — Server actions).
// Money fields (cod_amount, fee, charge) are paisa integers, already converted
// from the taka-facing form inputs via toPaisa() before the action is called.
import { z } from 'zod'

export const deliveryMethodSchema = z.enum(['rider', 'courier', 'pickup'])
export const deliveryCourierSchema = z.enum(['steadfast', 'pathao', 'redx', 'manual'])

export const deliveryAddressSchema = z.object({
  line1: z.string().trim().min(1, 'Address line is required').max(300),
  area: z.string().trim().max(200).optional().or(z.literal('')),
  district: z.string().trim().min(1, 'District is required'),
  postcode: z.string().trim().max(20).optional().or(z.literal('')),
})

export const createDeliverySchema = z
  .object({
    order_id: z.string().uuid(),
    method: deliveryMethodSchema,
    zone_id: z.string().uuid().nullable().optional(),
    rider_id: z.string().uuid().nullable().optional(),
    courier: deliveryCourierSchema.nullable().optional(),
    manual_tracking_code: z.string().trim().max(100).optional(),
    recipient_name: z.string().trim().min(1, 'Recipient name is required').max(200),
    recipient_phone: z.string().trim().min(6, 'Recipient phone is required').max(32),
    address: deliveryAddressSchema,
    cod_amount: z.number().int().min(0),
    fee: z.number().int().min(0),
    otp_enabled: z.boolean().default(false),
  })
  .refine((data) => data.method !== 'rider' || !!data.rider_id, {
    message: '배송기사를 선택하세요',
    path: ['rider_id'],
  })
  .refine((data) => data.method !== 'courier' || !!data.courier, {
    message: '택배사를 선택하세요',
    path: ['courier'],
  })

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>

export const assignRiderSchema = z.object({
  delivery_id: z.string().uuid(),
  rider_id: z.string().uuid(),
})
export type AssignRiderInput = z.infer<typeof assignRiderSchema>

export const markPickedUpSchema = z.object({ delivery_id: z.string().uuid() })
export type MarkPickedUpInput = z.infer<typeof markPickedUpSchema>

export const markInTransitSchema = z.object({ delivery_id: z.string().uuid() })
export type MarkInTransitInput = z.infer<typeof markInTransitSchema>

export const markDeliveredSchema = z.object({
  delivery_id: z.string().uuid(),
  otp: z.string().trim().max(16).optional(),
  cod_collected: z.boolean(),
})
export type MarkDeliveredInput = z.infer<typeof markDeliveredSchema>

export const markFailedSchema = z.object({
  delivery_id: z.string().uuid(),
  reason: z.string().trim().min(1, 'Reason is required').max(500),
})
export type MarkFailedInput = z.infer<typeof markFailedSchema>

export const markReturnedSchema = z.object({
  delivery_id: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
})
export type MarkReturnedInput = z.infer<typeof markReturnedSchema>

export const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  districts: z.array(z.string()).min(1, 'Select at least one district'),
  charge: z.number().int().min(0),
  cod_available: z.boolean().default(true),
  advance_required: z.boolean().default(false),
  eta_text: z.string().trim().max(60).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})
export type ZoneInput = z.infer<typeof zoneSchema>

export const riderSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: z.string().trim().min(6, 'Phone is required').max(32),
  vehicle: z.string().trim().max(60).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  user_id: z.string().uuid().optional().or(z.literal('')),
})
export type RiderInput = z.infer<typeof riderSchema>

export const settleCodSchema = z.object({
  rider_id: z.string().uuid(),
  delivery_ids: z.array(z.string().uuid()).min(1, 'Select at least one delivery'),
  note: z.string().trim().max(300).optional(),
})
export type SettleCodInput = z.infer<typeof settleCodSchema>
