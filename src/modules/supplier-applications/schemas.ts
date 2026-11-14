import { z } from 'zod'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const applicationSchema = z.object({
  company_name: z.string().trim().min(2, '회사명을 입력하세요').max(100),
  desired_slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, '미니샵 주소를 입력하세요')
    .max(40, '40자 이내로 입력하세요')
    .regex(SLUG_RE, '영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다 (예: hanil-machine)'),
  business_number: z
    .union([z.string().trim().regex(/^\d{3}-?\d{2}-?\d{5}$/, '사업자등록번호 10자리를 입력하세요 (예: 123-45-67890)'), z.literal('')])
    .optional(),
  contact_name: z.string().trim().min(1, '담당자명을 입력하세요').max(50),
  phone: z.string().trim().min(8, '연락처를 정확히 입력하세요').max(20),
  email: z.union([z.string().trim().email('이메일 형식이 올바르지 않습니다'), z.literal('')]).optional(),
  address: z.string().trim().max(200).optional(),
  homepage_url: z.union([z.string().trim().url('https://로 시작하는 주소를 입력하세요').max(300), z.literal('')]).optional(),
  /** 쉼표로 구분 */
  item_keywords: z.string().trim().max(300).optional(),
  message: z.string().trim().max(1000).optional(),
})
export type ApplicationInput = z.infer<typeof applicationSchema>

export const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(1, '거절 사유를 입력하세요').max(500),
})
