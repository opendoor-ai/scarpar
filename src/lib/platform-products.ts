// 플랫폼(전체 공급사) 상품 카드용 공통 조회 도우미 — 메인 화면·통합 제품 화면에서 함께 씁니다.

import { getAnonClient } from '@/lib/supabase/anon'
import type { Product } from '@/types/db'

import { getPrimaryImages } from '@/components/store/get-primary-images'
import type { ProductCardData } from '@/components/store/product-card'

export const PLATFORM_PRODUCT_COLUMNS =
  'id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder, condition, model_name, badges, org_id, org:orgs!inner(slug, name)'

export type PlatformProductRow = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder' | 'condition' | 'model_name' | 'badges'
> & {
  org_id: string
  org: { slug: string; name: string } | { slug: string; name: string }[] | null
}

export interface PlatformProductCard {
  card: ProductCardData
  orgSlug: string
  orgName: string
}

/** 상품 행들 → 카드 데이터 (대표 사진을 공급사별로 묶어서 한 번에 가져옴) */
export async function toPlatformCards(...lists: PlatformProductRow[][]): Promise<PlatformProductCard[][]> {
  const idsByOrg = new Map<string, Set<string>>()
  for (const r of lists.flat()) {
    const set = idsByOrg.get(r.org_id) ?? new Set<string>()
    set.add(r.id)
    idsByOrg.set(r.org_id, set)
  }
  const imageMaps = await Promise.all([...idsByOrg].map(([orgId, ids]) => getPrimaryImages(orgId, [...ids])))
  const images: Record<string, string | null> = Object.assign({}, ...imageMaps)

  return lists.map((rows) =>
    rows.flatMap((r) => {
      const org = Array.isArray(r.org) ? r.org[0] : r.org
      if (!org) return []
      return [{ card: { ...r, image: images[r.id] ?? null }, orgSlug: org.slug, orgName: org.name }]
    }),
  )
}

// ------------------------------------------------------------------ 자주 쓰는 조회

/** 상품 id 목록 → 카드 (순서 유지, 비공개·비활성 공급사 상품은 빠짐) */
export async function fetchPlatformCardsByIds(ids: string[]): Promise<PlatformProductCard[]> {
  if (ids.length === 0) return []
  const { data } = await getAnonClient()
    .from('products')
    .select(PLATFORM_PRODUCT_COLUMNS)
    .in('id', ids)
    .eq('status', 'active')
    .eq('org.is_active', true)
  const order = new Map(ids.map((id, i) => [id, i]))
  const rows = ((data ?? []) as unknown as PlatformProductRow[]).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )
  const [cards] = await toPlatformCards(rows)
  return cards
}

/** 최신 등록 상품 카드 (공급사를 고르면 그 공급사만) */
export async function fetchLatestPlatformCards(limit: number, orgId?: string): Promise<PlatformProductCard[]> {
  let q = getAnonClient()
    .from('products')
    .select(PLATFORM_PRODUCT_COLUMNS)
    .eq('status', 'active')
    .eq('org.is_active', true)
  if (orgId) q = q.eq('org_id', orgId)
  const { data } = await q.order('display_at', { ascending: false }).limit(limit)
  const [cards] = await toPlatformCards((data ?? []) as unknown as PlatformProductRow[])
  return cards
}
