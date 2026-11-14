// 사이트 운영 설정 읽기 (서버 전용, 요청마다 한 번)

import 'server-only'

import { cache } from 'react'

import { getAnonClient } from '@/lib/supabase/anon'

import { DEFAULT_APP, DEFAULT_DISPLAY, DEFAULT_SEARCH, DEFAULT_SEO, type SiteConfig } from './schemas'

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  let data: Record<string, unknown> = {}
  try {
    const res = await getAnonClient().from('site_settings').select('data').eq('id', 1).maybeSingle()
    data = ((res.data as { data: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>
  } catch {
    // 기본값 사용
  }
  const pick = <T extends object>(key: string, def: T): T => ({ ...def, ...((data[key] as Partial<T> | undefined) ?? {}) })
  const display = pick('display', DEFAULT_DISPLAY)
  return {
    seo: pick('seo', DEFAULT_SEO),
    search: pick('search', DEFAULT_SEARCH),
    display: {
      ...display,
      card: { ...DEFAULT_DISPLAY.card, ...display.card },
      detail: { ...DEFAULT_DISPLAY.detail, ...display.detail },
    },
    app: pick('app', DEFAULT_APP),
  }
})
