// 배너 관리 — 배너 그룹·배너 입력 규칙 (화면·서버 공용)

import { z } from 'zod'

export const GROUP_KINDS = ['common', 'main', 'hub', 'supplier'] as const
export type GroupKind = (typeof GROUP_KINDS)[number]
export const GROUP_KIND_LABEL: Record<GroupKind, string> = {
  common: '공통',
  main: '메인',
  hub: '허브',
  supplier: '공급사',
}

export const MAX_TEXTS = 10
export const MAX_COLORS = 4
export const MAX_PRODUCTS = 10
export const MAX_EXTRA_IMAGES = 5

const HEX = /^#[0-9a-fA-F]{3,8}$/

export const textItemSchema = z.object({
  text: z.string().max(2000),
  pc_size: z.number().int().min(6).max(200).nullable().optional(),
  m_size: z.number().int().min(6).max(200).nullable().optional(),
  color: z
    .string()
    .trim()
    .refine((v) => v === '' || HEX.test(v), '색상은 #000000 형식으로 입력하세요')
    .optional(),
  bold: z.boolean().optional(),
})
export type TextItem = z.infer<typeof textItemSchema>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const bannerItemSchema = z
  .object({
    id: z.string().uuid().nullable(),
    title: z.string().trim().max(200), // 이미지 설명(alt) 겸 관리용 이름
    image_pc: z.string().trim().max(1000),
    image_mobile: z.string().trim().max(1000),
    texts: z.array(textItemSchema).max(MAX_TEXTS),
    link_url: z
      .string()
      .trim()
      .max(1000)
      .refine((v) => v === '' || v === '#' || v === '#none' || v.startsWith('/') || /^https?:\/\//i.test(v), {
        message: '링크는 /로 시작하거나 https:// 주소여야 해요',
      }),
    link_target: z.enum(['_self', '_blank']),
    colors: z
      .array(z.string().trim().refine((v) => v === '' || HEX.test(v), '색상은 #000000 형식으로 입력하세요'))
      .max(MAX_COLORS),
    html: z.string().max(50_000),
    product_ids: z.array(z.string().uuid()).max(MAX_PRODUCTS),
    extra_images: z.array(z.string().trim().max(1000)).max(MAX_EXTRA_IMAGES),
    always: z.boolean(),
    starts_on: z.string().refine((v) => v === '' || DATE_RE.test(v), '시작일을 확인하세요'),
    ends_on: z.string().refine((v) => v === '' || DATE_RE.test(v), '종료일을 확인하세요'),
    is_active: z.boolean(),
    category_id: z.string().uuid().nullable(),
    // 분류·검색 허브: 노출할 분류 번호(쉼표), 검색 결과에도 보이기, 검색어
    target_cate_nos: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^\d+(\s*,\s*\d+)*$/.test(v), '분류 번호는 숫자를 쉼표로 나눠 적어요 (예: 1, 11, 12)'),
    show_in_search: z.boolean(),
    search_keywords: z.string().trim().max(500),
    // 광고 계약 정보 (선택)
    advertiser_org_id: z.string().uuid().nullable(),
    advertiser_name: z.string().trim().max(100),
    payment_status: z.enum(['unpaid', 'paid', 'free']),
    price_won: z.number().int().min(0).max(100_000_000_000).nullable(),
    memo: z.string().trim().max(1000),
  })
  .refine((v) => v.always || !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, {
    message: '종료일은 시작일과 같거나 뒤여야 해요',
    path: ['ends_on'],
  })
export type BannerItem = z.infer<typeof bannerItemSchema>

export const groupSchema = z.object({
  name: z.string().trim().min(1, '그룹 이름을 입력하세요').max(100),
  code: z
    .string()
    .trim()
    .min(2, '배너 코드는 2글자 이상이에요')
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, '배너 코드는 영문·숫자·_·- 만 쓸 수 있어요'),
  kind: z.enum(GROUP_KINDS),
  guide: z.string().max(3000),
  template_html: z.string().max(50_000),
  is_active: z.boolean(),
})
export type GroupInput = z.infer<typeof groupSchema>

export interface BannerGroupRow {
  id: string
  code: string
  name: string
  kind: GroupKind
  guide: string | null
  template_html: string | null
  is_builtin: boolean
  is_active: boolean
  sort_order: number
}

/** 그룹 + 배너를 한 파일로 (파일 백업·시점 복구 공용) */
export interface GroupBackup {
  version: 1
  exported_at: string
  group: Pick<BannerGroupRow, 'code' | 'name' | 'kind' | 'guide' | 'template_html' | 'is_active'>
  banners: BannerItem[]
}

/** 저장된 행 → 화면 편집용 */
export function emptyBanner(sortHint = 0): BannerItem & { _key: string; _sort: number } {
  return {
    _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    _sort: sortHint,
    id: null,
    title: '',
    image_pc: '',
    image_mobile: '',
    texts: [{ text: '' }],
    link_url: '',
    link_target: '_self',
    colors: ['', '', '', ''],
    html: '',
    product_ids: [],
    extra_images: [],
    always: true,
    starts_on: '',
    ends_on: '',
    is_active: true,
    category_id: null,
    target_cate_nos: '',
    show_in_search: false,
    search_keywords: '',
    advertiser_org_id: null,
    advertiser_name: '',
    payment_status: 'free',
    price_won: null,
    memo: '',
  }
}
