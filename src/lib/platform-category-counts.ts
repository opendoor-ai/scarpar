// 전체 카테고리 메뉴용 — 분류마다 지금 공개 중인 제품 수 (모든 공급사, 운영중 공급사만)
// 1차 분류 수 = 그 아래 2차 분류 제품까지 합친 수. 5분마다 새로 세요(매 화면마다 세지 않도록).

import { unstable_cache } from 'next/cache'

import { getAnonClient } from '@/lib/supabase/anon'

async function countAll(): Promise<Record<string, number>> {
  const { data, error } = await getAnonClient()
    .from('products')
    .select('category_id, org:orgs!inner(is_active)')
    .eq('status', 'active')
    .eq('org.is_active', true)
    .not('category_id', 'is', null)
    .limit(50000)
  if (error || !data) return {}
  const counts: Record<string, number> = {}
  for (const r of data as { category_id: string | null }[]) {
    if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1
  }
  return counts
}

/** 분류 id → 제품 수 (2차 분류 기준. 1차 합계는 화면에서 하위 합으로 계산) */
export const getPlatformCategoryCounts = unstable_cache(countAll, ['platform-category-counts'], { revalidate: 300 })
