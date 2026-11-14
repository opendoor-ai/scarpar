// 사이트 콘텐츠 (쇼츠 영상·블로그 글·매거진) — 입력 규칙과 도우미

import { z } from 'zod'

export const CONTENT_KINDS = ['short', 'blog', 'magazine'] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]
export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  short: '쇼츠 영상',
  blog: '블로그 글',
  magazine: '매거진',
}

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'https:// 로 시작하는 주소를 입력하세요')

export const contentSchema = z
  .object({
    kind: z.enum(CONTENT_KINDS),
    title: z.string().trim().min(1, '제목을 입력하세요').max(200),
    url: optionalUrl,
    thumbnail: z.string().trim().max(1000),
    summary: z.string().trim().max(500),
    body_html: z.string().max(100_000),
    product_no: z.coerce.number().int().min(0).nullable(),
    is_published: z.boolean(),
    sort_order: z.coerce.number().int().min(0).max(9999),
  })
  .refine((v) => v.kind !== 'short' || youtubeId(v.url), {
    message: '유튜브 쇼츠 주소를 입력하세요 (예: https://youtube.com/shorts/...)',
    path: ['url'],
  })
  .refine((v) => v.kind !== 'blog' || v.url, { message: '블로그 글 주소를 입력하세요', path: ['url'] })
export type ContentInput = z.infer<typeof contentSchema>

/** 유튜브 주소(쇼츠·일반·짧은 주소)에서 영상 id 꺼내기 */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const m =
    url.match(/youtube\.com\/shorts\/([\w-]{6,})/i) ??
    url.match(/youtu\.be\/([\w-]{6,})/i) ??
    url.match(/[?&]v=([\w-]{6,})/i) ??
    url.match(/youtube\.com\/embed\/([\w-]{6,})/i)
  return m ? m[1] : null
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
