// 구매문의 — 입력 검사와 화면 공통 값 (클라이언트에서도 씀)

import { z } from 'zod'

export const REQUEST_CONDITIONS = ['any', 'new', 'used'] as const
export type RequestCondition = (typeof REQUEST_CONDITIONS)[number]
export const CONDITION_LABEL: Record<RequestCondition, string> = { any: '무관', new: '신품', used: '중고' }

export const REQUEST_STATUSES = ['open', 'in_progress', 'done', 'hidden'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export const STATUS_LABEL: Record<RequestStatus, string> = {
  open: '상담가능',
  in_progress: '상담중',
  done: '상담완료',
  hidden: '숨김',
}

export const MAX_REQUEST_IMAGES = 3

/** 고객이 남기는 구매문의 */
export const purchaseRequestSchema = z.object({
  title: z.string().trim().min(2, '제품명을 2자 이상 입력하세요').max(80, '제품명이 너무 깁니다'),
  condition: z.enum(REQUEST_CONDITIONS),
  detail: z.string().trim().min(5, '상세 내용을 5자 이상 입력하세요').max(3000, '상세 내용이 너무 깁니다'),
  images: z.array(z.string().max(300)).max(MAX_REQUEST_IMAGES),
  authorName: z.string().trim().min(1, '문의자명을 입력하세요').max(50, '문의자명이 너무 깁니다'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-\s]{9,20}$/, '연락처를 숫자로 입력하세요 (예: 010-1234-5678)'),
  email: z.string().trim().email('이메일 형식이 올바르지 않습니다').max(100).optional().or(z.literal('')),
  region: z.string().trim().max(30).optional().or(z.literal('')),
  agree: z.literal(true, { errorMap: () => ({ message: '개인정보 수집·이용에 동의해 주세요' }) }),
  /** 스팸 방지용 숨김 칸 — 사람이 채우지 않습니다 */
  website: z.string().max(0).optional().or(z.literal('')),
})
export type PurchaseRequestInput = z.infer<typeof purchaseRequestSchema>

/** 010-1234-5678 → 010-1234-**** */
export function maskPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, '')
  if (d.length < 7) return '***-****'
  const tail = 4
  const head = d.startsWith('02') ? 2 : 3
  const mid = d.slice(head, d.length - tail)
  return `${d.slice(0, head)}-${mid}-****`
}

/** 하이픈 넣어 보기 좋게 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, '')
  if (d.length < 7) return phone
  const head = d.startsWith('02') ? 2 : 3
  return `${d.slice(0, head)}-${d.slice(head, d.length - 4)}-${d.slice(-4)}`
}

/** "3분 전", "2시간 전", "5일 전", 그 이상은 날짜 */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
}
