// 플랫폼 공통 카테고리.
// 전자동(플랫폼 운영 조직)이 관리하는 카테고리 하나를 모든 공급사가 함께 씁니다.
// 그래서 통합 검색에서 카테고리를 고르면 모든 공급사 상품이 한 번에 나옵니다.
// 카테고리는 공개 정보라 방문자 권한(anon)으로 읽습니다 (0006에서 읽기 권한 부여).

import { cache } from 'react'

import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'

export interface PlatformCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
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
    .select('id, name, slug, parent_id, sort_order')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) console.error('[platform categories] read failed:', error.message)
  return (data ?? []) as PlatformCategory[]
})
