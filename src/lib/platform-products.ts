// 플랫폼(전체 공급사) 상품 카드용 공통 조회 도우미 — 메인 화면·통합 제품 화면에서 함께 씁니다.

import type { Product } from '@/types/db'

import { getPrimaryImages } from '@/components/store/get-primary-images'
import type { ProductCardData } from '@/components/store/product-card'

export const PLATFORM_PRODUCT_COLUMNS =
  'id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder, org_id, org:orgs!inner(slug, name)'

export type PlatformProductRow = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
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
