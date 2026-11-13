import { z } from 'zod'

import type { Course, Customer, Enrollment } from '@/types/db'

// ---------------------------------------------------------------------------
// Form validation (RHF + zodResolver). Amounts are entered as taka strings
// and converted to paisa via toPaisa() inside the server action.
// ---------------------------------------------------------------------------

const moneyString = z
  .string()
  .trim()
  .min(1, 'Price is required')
  .refine((v) => Number.isFinite(Number(v.replace(/,/g, ''))) && Number(v.replace(/,/g, '')) >= 0, {
    message: '금액을 정확히 입력하세요',
  })

export const courseFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  price: moneyString,
  cover_media_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'active', 'archived']),
})
export type CourseFormValues = z.infer<typeof courseFormSchema>

export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  video_url: z.string().trim().max(500).optional().or(z.literal('')),
  content: z.string().trim().max(20000).optional().or(z.literal('')),
  is_free: z.boolean(),
})
export type LessonFormValues = z.infer<typeof lessonFormSchema>

export const enrollCustomerSchema = z.object({
  customer_id: z.string().uuid('고객을 선택하세요'),
})
export type EnrollCustomerValues = z.infer<typeof enrollCustomerSchema>

// ---------------------------------------------------------------------------
// View row types — shapes produced by the server-component queries in
// page.tsx / [id]/page.tsx and consumed by components/*. Kept here (a plain
// module, unlike actions.ts which is 'use server') so both pages and client
// components import one source of truth.
// ---------------------------------------------------------------------------

export type CourseCover = { id: string; path: string } | null

export interface CourseListRow extends Course {
  cover: CourseCover
  lessons_count: number
  enrollments_count: number
}

export interface CourseDetailRow extends Course {
  cover: CourseCover
}

export interface EnrollmentRow extends Enrollment {
  customer: Pick<Customer, 'name' | 'phone'> | null
}

export type CustomerSearchResult = Pick<Customer, 'id' | 'name' | 'phone'>
