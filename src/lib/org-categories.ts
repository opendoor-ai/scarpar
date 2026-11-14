// 공급사(미니샵) 카테고리 — 플랫폼 공통 분류 중 "이 공급사 제품이 있는 분류"만 골라 상품 수와 함께 돌려줍니다.

import { cache } from 'react'

import { getPlatformCategories, visibleCategories, type PlatformCategory } from '@/lib/platform-categories'
import { getAnonClient } from '@/lib/supabase/anon'

export interface OrgCategories {
  /** 이 공급사 제품이 있는 분류 (1차 + 그 아래 제품 있는 2차) */
  categories: PlatformCategory[]
  /** 분류 id → 상품 수 (1차는 하위 2차 상품까지 합친 수) */
  counts: Record<string, number>
  /** 분류 미지정 상품 수 */
  uncategorized: number
}

export const getOrgCategories = cache(async (orgId: string): Promise<OrgCategories> => {
  const [all, { data }] = await Promise.all([
    getPlatformCategories(),
    getAnonClient().from('products').select('category_id').eq('org_id', orgId).eq('status', 'active').limit(20000),
  ])
  const visible = visibleCategories(all)
  const byId = new Map(visible.map((c) => [c.id, c]))

  const counts: Record<string, number> = {}
  let uncategorized = 0
  for (const p of (data ?? []) as { category_id: string | null }[]) {
    const c = p.category_id ? byId.get(p.category_id) : undefined
    if (!c) {
      uncategorized += 1
      continue
    }
    counts[c.id] = (counts[c.id] ?? 0) + 1
    if (c.parent_id && byId.has(c.parent_id)) counts[c.parent_id] = (counts[c.parent_id] ?? 0) + 1
  }

  const categories = visible.filter((c) => (counts[c.id] ?? 0) > 0)
  return { categories, counts, uncategorized }
})
