// 사이트(플랫폼) 설정 — 상단 알림 띠, 바닥글 사업자 정보 등. 플랫폼 관리자가 /admin/site 에서 수정.

import { cache } from 'react'
import { z } from 'zod'

import { getAnonClient } from '@/lib/supabase/anon'

export const siteSettingsSchema = z.object({
  notice_enabled: z.boolean(),
  notice_text: z.string().trim().max(120),
  notice_link_label: z.string().trim().max(30),
  notice_url: z.string().trim().max(500),
  company_name: z.string().trim().max(100),
  ceo: z.string().trim().max(50),
  business_no: z.string().trim().max(30),
  mail_order_no: z.string().trim().max(50),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  fax: z.string().trim().max(30),
  email: z.string().trim().max(100),
  privacy_officer: z.string().trim().max(50),
  cs_hours: z.string().trim().max(200),
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  notice_enabled: true,
  notice_text: '공급사 모집중! 지금 신청하세요',
  notice_link_label: '무료제품등록',
  notice_url: '/signup',
  company_name: '',
  ceo: '',
  business_no: '',
  mail_order_no: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  privacy_officer: '',
  cs_hours: '평일 09:00 ~ 18:00 (점심 12:00 ~ 13:00, 주말·공휴일 휴무)',
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const { data, error } = await getAnonClient().from('site_settings').select('data').eq('id', 1).maybeSingle()
    if (error || !data) return DEFAULT_SITE_SETTINGS
    return { ...DEFAULT_SITE_SETTINGS, ...((data as { data: Partial<SiteSettings> }).data ?? {}) }
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
})
