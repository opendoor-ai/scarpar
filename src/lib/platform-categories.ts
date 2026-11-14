// 플랫폼 공통 카테고리.
// 전자동(플랫폼 운영 조직)이 관리하는 카테고리 하나를 모든 공급사가 함께 씁니다.
// 그래서 통합 검색에서 카테고리를 고르면 모든 공급사 상품이 한 번에 나옵니다.
// 카테고리는 공개 정보라 방문자 권한(anon)으로 읽습니다 (0006에서 읽기 권한 부여).

import { cache } from 'react'

import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'

export type CategoryProductSort = 'latest' | 'oldest' | 'name' | 'price_asc' | 'price_desc'

export interface PlatformCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
  /** 카테고리 번호 (0017, 주소 ?cate_no=번호). SQL 실행 전에는 0 */
  cate_no: number
  /** 아래는 0015 상세 설정 (SQL 실행 전에는 기본값) */
  description: string | null
  is_visible: boolean
  show_on_main: boolean
  top_image: string | null
  icon_image: string | null
  product_sort: CategoryProductSort
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
}

type RawCategory = Partial<PlatformCategory> & Pick<PlatformCategory, 'id' | 'name' | 'slug' | 'parent_id' | 'sort_order'>

/** DB 행 → 기본값을 채운 카테고리 (새 칸이 아직 없어도 안전) */
export function normalizeCategory(r: RawCategory): PlatformCategory {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    parent_id: r.parent_id,
    sort_order: r.sort_order,
    cate_no: Number(r.cate_no ?? 0),
    description: r.description ?? null,
    is_visible: r.is_visible ?? true,
    show_on_main: r.show_on_main ?? true,
    top_image: r.top_image ?? null,
    icon_image: r.icon_image ?? null,
    product_sort: r.product_sort ?? 'latest',
    seo_title: r.seo_title ?? null,
    seo_description: r.seo_description ?? null,
    seo_keywords: r.seo_keywords ?? null,
  }
}

/** 고객 화면에 보여줄 카테고리만 (표시안함 + 숨긴 1차의 하위 제외) */
export function visibleCategories(rows: PlatformCategory[]): PlatformCategory[] {
  const hidden = new Set(rows.filter((c) => !c.is_visible).map((c) => c.id))
  return rows.filter((c) => c.is_visible && !(c.parent_id && hidden.has(c.parent_id)))
}

/** 플랫폼 운영 조직 id (없으면 null) */
export const getPlatformOrgId = cache(async (): Promise<string | null> => {
  const { data } = await getAnonClient()
    .from('orgs')
    .select('id')
    .eq('slug', PLATFORM_ORG_SLUG)
    .eq('is_active', true)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
})

/** 플랫폼 공통 카테고리 전체 (관리자 정렬 순서 → 등록 순서) */
export const getPlatformCategories = cache(async (): Promise<PlatformCategory[]> => {
  const orgId = await getPlatformOrgId()
  if (!orgId) return []
  const { data, error } = await getAnonClient()
    .from('categories')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) console.error('[platform categories] read failed:', error.message)
  return ((data ?? []) as RawCategory[]).map(normalizeCategory)
})

/** 카테고리 상품 진열 순서 → 정렬 기준 */
export function categorySortSpec(sort: CategoryProductSort): { column: 'created_at' | 'display_at' | 'name' | 'price'; ascending: boolean } {
  switch (sort) {
    case 'oldest':
      return { column: 'created_at', ascending: true }
    case 'name':
      return { column: 'name', ascending: true }
    case 'price_asc':
      return { column: 'price', ascending: true }
    case 'price_desc':
      return { column: 'price', ascending: false }
    default:
      // 최신순 = 진열 시각 (새로 등록하거나 점프하면 맨 위)
      return { column: 'display_at', ascending: false }
  }
}

/** 카테고리 주소 값: 번호가 있으면 번호, (SQL 실행 전이면) 영문 주소 */
export function categoryKey(c: Pick<PlatformCategory, 'cate_no' | 'slug'>): string {
  return c.cate_no ? String(c.cate_no) : c.slug
}

/** 주소의 ?cate_no=54 (또는 예전 ?category=영문주소) → 카테고리 */
export function findCategoryByParam<T extends Pick<PlatformCategory, 'cate_no' | 'slug'>>(
  rows: T[],
  params: { cate_no?: string; category?: string },
): T | undefined {
  if (params.cate_no) {
    const n = Number(params.cate_no)
    return rows.find((c) => (c.cate_no && c.cate_no === n) || c.slug === params.cate_no)
  }
  if (params.category) return rows.find((c) => c.slug === params.category)
  return undefined
}

/** 고객 화면 카테고리 주소 쿼리 */
export function categoryQuery(c: Pick<PlatformCategory, 'cate_no' | 'slug'>): string {
  return `cate_no=${encodeURIComponent(categoryKey(c))}`
}
