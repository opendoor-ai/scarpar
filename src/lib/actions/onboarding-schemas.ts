// Zod schema shared between the onboarding client stepper and
// src/lib/actions/onboarding.ts. Kept out of onboarding.ts itself: a 'use server'
// file may only export async functions, so the schema object lives here instead.
import { z } from 'zod'

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, '공급사명을 2자 이상 입력하세요').max(120),
  slug: z
    .string()
    .trim()
    .min(3, '공급사 아이디를 3자 이상 입력하세요')
    .max(40, '공급사 아이디는 40자까지예요')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, '공급사 아이디는 영문 소문자·숫자·하이픈(-)만 쓸 수 있어요 (예: hanil-machine)'),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{1,3}-?\d{3,4}-?\d{4}$|^1[5689]\d{2}-?\d{4}$/, '전화번호를 정확히 입력하세요 (예: 010-1234-5678)'),
  vertical: z.enum(['ecommerce', 'courses', 'services', 'realestate']),
  seedDemo: z.boolean(),
  /** 공급사가 직접 로그인할 대표 계정 (선택). 적으면 이 계정이 공급사 대표가 됨 */
  ownerEmail: z.string().trim().toLowerCase().email('로그인 이메일 형식이 올바르지 않아요').optional().or(z.literal('')),
  ownerPassword: z.string().max(72).optional().or(z.literal('')),
})

export type CreateOrgInput = z.infer<typeof createOrgSchema>
