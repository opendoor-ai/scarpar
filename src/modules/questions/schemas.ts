import { z } from 'zod'

/** 쇼핑몰에서 고객이 남기는 질문 */
export const askQuestionSchema = z.object({
  orgSlug: z.string().min(1),
  productId: z.string().uuid(),
  authorName: z.string().trim().min(1, '이름을 입력하세요').max(50, '이름이 너무 깁니다'),
  authorContact: z.string().trim().max(100, '연락처가 너무 깁니다').optional().or(z.literal('')),
  question: z.string().trim().min(5, '질문을 5자 이상 입력하세요').max(2000, '질문이 너무 깁니다'),
  isPrivate: z.boolean(),
  /** 스팸 방지용 숨김 칸 — 사람이 채우지 않습니다 */
  website: z.string().max(0).optional().or(z.literal('')),
})
export type AskQuestionInput = z.infer<typeof askQuestionSchema>

/** 관리자 답변 */
export const answerQuestionSchema = z.object({
  id: z.string().uuid(),
  answer: z.string().trim().min(1, '답변을 입력하세요').max(4000, '답변이 너무 깁니다'),
})
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>
