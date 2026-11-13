// Zod schemas shared between the (auth) client forms and src/lib/actions/auth.ts.
// Kept out of auth.ts itself: a 'use server' file may only export async
// functions, so schema objects (runtime values) have to live in a plain module.
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, '이메일을 입력하세요').email('이메일 형식이 올바르지 않습니다'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
  /** Preserves ?next= through the invite -> login -> accept round trip. */
  next: z.string().optional(),
})

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, '이름을 입력하세요').max(120),
  email: z.string().trim().min(1, '이메일을 입력하세요').email('이메일 형식이 올바르지 않습니다'),
  password: z.string().min(8, '8자 이상 입력하세요'),
  next: z.string().optional(),
})

export const forgotSchema = z.object({
  email: z.string().trim().min(1, '이메일을 입력하세요').email('이메일 형식이 올바르지 않습니다'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, '8자 이상 입력하세요'),
    confirmPassword: z.string().min(1, '비밀번호를 한 번 더 입력하세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ForgotInput = z.infer<typeof forgotSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
