// 지금 진행 중인 광고 가져오기 (쇼핑몰 화면용, 서버 전용)
// 광고 표는 방문자 직접 읽기 권한이 없어서 service role로 읽고, 화면에 필요한 값만 넘깁니다.

import { mediaUrl } from '@/lib/media-url'
import { getAdminClient } from '@/lib/supabase/admin'

export interface LiveBanner {
  id: string
  title: string
  link_url: string
  image_pc: string
  image_mobile: string
}

/** placement: main(전체 제품 첫 화면) 또는 category(카테고리 페이지, categoryIds 중 하나에 걸린 배너) */
export async function getLiveBanners(placement: 'main' | 'category', categoryIds: string[] = []): Promise<LiveBanner[]> {
  try {
    const now = new Date().toISOString()
    let q = getAdminClient()
      .from('banner_ads')
      .select('id, title, link_url, image_pc, image_mobile, sort_order')
      .eq('placement', placement)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10)
    if (placement === 'category') {
      if (categoryIds.length === 0) return []
      q = q.in('category_id', categoryIds)
    }
    const { data, error } = await q
    if (error) {
      console.error('[ads] banners read failed:', error.message)
      return []
    }
    return ((data ?? []) as { id: string; title: string; link_url: string; image_pc: string; image_mobile: string | null }[]).map(
      (b) => ({
        id: b.id,
        title: b.title,
        link_url: b.link_url,
        image_pc: mediaUrl(b.image_pc),
        image_mobile: mediaUrl(b.image_mobile || b.image_pc),
      }),
    )
  } catch (err) {
    console.error('[ads] banners failed', err)
    return []
  }
}

/** 지금 상단 노출 중인 상품 id (main: 첫 화면 / category: 해당 카테고리들에 속한 상품) */
export async function getLivePromotedProductIds(
  placement: 'main' | 'category',
  categoryIds: string[] = [],
): Promise<string[]> {
  try {
    const now = new Date().toISOString()
    let q = getAdminClient()
      .from('product_promotions')
      .select('product_id, created_at, product:products!inner(category_id, status)')
      .eq('placement', placement)
      .eq('is_active', true)
      .eq('product.status', 'active')
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('created_at', { ascending: true })
      .limit(20)
    if (placement === 'category') {
      if (categoryIds.length === 0) return []
      q = q.in('product.category_id', categoryIds)
    }
    const { data, error } = await q
    if (error) {
      console.error('[ads] promotions read failed:', error.message)
      return []
    }
    return [...new Set(((data ?? []) as { product_id: string }[]).map((r) => r.product_id))]
  } catch (err) {
    console.error('[ads] promotions failed', err)
    return []
  }
}
