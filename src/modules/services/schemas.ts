import { z } from 'zod'

import type { Appointment, Customer, ServiceJob, ServiceJobStatus } from '@/types/db'

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

const moneyString = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine((v) => Number.isFinite(Number(v.replace(/,/g, ''))) && Number(v.replace(/,/g, '')) >= 0, {
    message: '금액을 정확히 입력하세요',
  })

const optionalMoneyString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || (Number.isFinite(Number(v.replace(/,/g, ''))) && Number(v.replace(/,/g, '')) >= 0), {
    message: '금액을 정확히 입력하세요',
  })

export const newJobCustomerSchema = z.union([
  z.object({ mode: z.literal('existing'), customer_id: z.string().uuid('고객을 선택하세요') }),
  z.object({
    mode: z.literal('new'),
    customer_name: z.string().trim().min(1, 'Name is required'),
    customer_phone: z.string().trim().min(6, 'Enter a valid phone number'),
  }),
])
export type NewJobCustomerValues = z.infer<typeof newJobCustomerSchema>

export const newJobSchema = z.object({
  customer: newJobCustomerSchema,
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  quote_amount: moneyString,
  scheduled_at: z.string().trim().optional().or(z.literal('')),
  address_line1: z.string().trim().max(300).optional().or(z.literal('')),
  address_district: z.string().trim().optional().or(z.literal('')),
})
export type NewJobValues = z.infer<typeof newJobSchema>

export const jobFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  quote_amount: moneyString,
  final_amount: optionalMoneyString,
  scheduled_at: z.string().trim().optional().or(z.literal('')),
  assigned_to: z.string().uuid().nullable().optional(),
  address_line1: z.string().trim().max(300).optional().or(z.literal('')),
  address_district: z.string().trim().optional().or(z.literal('')),
})
export type JobFormValues = z.infer<typeof jobFormSchema>

export const appointmentFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  starts_at: z.string().trim().min(1, 'Start time is required'),
  ends_at: z.string().trim().optional().or(z.literal('')),
  customer_id: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
})
export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>

// ---------------------------------------------------------------------------
// Status transition map — local to this slice. src/lib/status.ts only ships
// flow maps for order/delivery; service_jobs gets its own here rather than
// editing that shared file.
// ---------------------------------------------------------------------------

export const JOB_STATUS_FLOW: Record<ServiceJobStatus, ServiceJobStatus[]> = {
  quoted: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: ['invoiced', 'cancelled'],
  invoiced: [],
  cancelled: [],
}

// ---------------------------------------------------------------------------
// View row types
// ---------------------------------------------------------------------------

export interface JobAddress {
  line1?: string
  district?: string
}

export interface JobListRow extends ServiceJob {
  customer: Pick<Customer, 'name' | 'phone'> | null
  assigned_to_name: string | null
}

export interface JobDetailRow extends ServiceJob {
  customer: Pick<Customer, 'name' | 'phone' | 'email'> | null
}

export interface AppointmentRow extends Appointment {
  customer: Pick<Customer, 'name'> | null
}

export type CustomerSearchResult = Pick<Customer, 'id' | 'name' | 'phone'>

export interface TeamMember {
  id: string
  name: string
}
