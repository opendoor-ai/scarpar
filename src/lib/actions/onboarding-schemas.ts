// Zod schema shared between the onboarding client stepper and
// src/lib/actions/onboarding.ts. Kept out of onboarding.ts itself: a 'use server'
// file may only export async functions, so the schema object lives here instead.
import { z } from 'zod'

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, '회사(조직) 이름을 입력하세요').max(120),
  slug: z
    .string()
    .trim()
    .min(2, '주소(영문)를 입력하세요')
    .max(60)
    .regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다'),
  phone: z.string().trim().min(6, '전화번호를 정확히 입력하세요').max(20),
  vertical: z.enum(['ecommerce', 'courses', 'services', 'realestate']),
  seedDemo: z.boolean(),
})

export type CreateOrgInput = z.infer<typeof createOrgSchema>
