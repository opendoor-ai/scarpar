// /sitemap.xml — 검색엔진(네이버·구글)에 알려줄 공개 페이지 목록을 자동으로 만듭니다.
// 활성 공급사의 미니샵 홈, 상품 목록, 카테고리, 공개 상품, 게시된 CMS 페이지를 포함합니다.

import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { getAnonClient } from '@/lib/supabase/anon'

// 1시간마다 새로 만듦 (상품이 늘어도 자동 반영)
export const revalidate = 3600

const MAX_URLS = 45000
const PAGE = 1000

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = []
  for (let from = 0; rows.length < MAX_URLS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/+$/, '')
  const entries: MetadataRoute.Sitemap = []

  try {
    const supabase = getAnonClient()
    const { data: orgRows } = await supabase.from('orgs').select('id, slug, updated_at').eq('is_active', true)
    const orgs = (orgRows ?? []) as { id: string; slug: string; updated_at: string }[]
    if (orgs.length === 0) return entries
    const slugById = new Map(orgs.map((o) => [o.id, o.slug]))
    const orgIds = orgs.map((o) => o.id)

    for (const o of orgs) {
      entries.push({ url: `${base}/s/${o.slug}`, lastModified: o.updated_at, changeFrequency: 'daily', priority: 0.8 })
      entries.push({ url: `${base}/s/${o.slug}/products`, changeFrequency: 'daily', priority: 0.7 })
    }

    // 통합 제품 검색 + 플랫폼 공통 카테고리 페이지
    entries.push({ url: `${base}/`, changeFrequency: 'daily', priority: 1 })
    entries.push({ url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 })
    for (const c of visibleCategories(await getPlatformCategories())) {
      entries.push({
        url: `${base}/products?${categoryQuery(c)}`,
        changeFrequency: 'daily',
        priority: c.parent_id ? 0.6 : 0.7,
      })
    }

    const products = await fetchAll<{ org_id: string; product_no: number; updated_at: string }>((from, to) =>
      supabase
        .from('products')
        .select('org_id, product_no, updated_at')
        .in('org_id', orgIds)
        .eq('status', 'active')
        .order('product_no', { ascending: true })
        .range(from, to),
    )
    for (const p of products) {
      const orgSlug = slugById.get(p.org_id)
      if (!orgSlug) continue
      entries.push({
        url: `${base}/s/${orgSlug}/products/${p.product_no}`,
        lastModified: p.updated_at,
        changeFrequency: 'weekly',
        priority: 0.9,
      })
    }

    const pages = await fetchAll<{ org_id: string; slug: string; type: string; updated_at: string }>((from, to) =>
      supabase
        .from('cms_pages')
        .select('org_id, slug, type, updated_at')
        .in('org_id', orgIds)
        .eq('status', 'published')
        .range(from, to),
    )
    for (const p of pages) {
      const orgSlug = slugById.get(p.org_id)
      if (!orgSlug || p.type === 'home' || p.slug === 'home') continue // 홈은 위의 미니샵 주소와 같음
      entries.push({ url: `${base}/s/${orgSlug}/${p.slug}`, lastModified: p.updated_at, changeFrequency: 'monthly', priority: 0.4 })
    }
  } catch (err) {
    console.error('[sitemap] failed:', err)
  }

  return entries.slice(0, MAX_URLS)
}
