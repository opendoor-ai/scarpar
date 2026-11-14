// 지금 진행 중인 배너·광고 가져오기 (사이트 화면용, 서버 전용)
// 배너는 그룹(banner_groups)에 속하고, 그룹이 꺼져 있으면 보이지 않아요.
// 그룹에 "배너 코드(템플릿)"가 있으면 그 코드로 HTML을 만들어 보여줍니다.

import { cache } from 'react'

import { getPrimaryImages } from '@/components/store/get-primary-images'
import { mediaUrl } from '@/lib/media-url'
import { getAdminClient } from '@/lib/supabase/admin'

import type { BannerGroupRow, TextItem } from './banner-types'
import { isOwnTemplate, renderBannerCode, type TemplateBanner, type TemplateProduct } from './template'

export interface LiveBanner {
  id: string
  title: string
  link_url: string
  link_target: '_self' | '_blank'
  image_pc: string
  image_mobile: string
  subtitle?: string | null
  phone?: string | null
  advertiser_org_id?: string | null
  texts: TextItem[]
  colors: string[]
  html: string
  product_ids: string[]
  extra_images: string[]
}

type Row = {
  id: string
  title: string
  link_url: string | null
  link_target?: string | null
  image_pc: string | null
  image_mobile: string | null
  subtitle?: string | null
  phone?: string | null
  advertiser_org_id: string | null
  texts?: TextItem[] | null
  colors?: string[] | null
  html?: string | null
  product_ids?: string[] | null
  extra_images?: string[] | null
}

function toLive(b: Row): LiveBanner {
  const texts = b.texts ?? []
  const strip = (v?: string | null) => (v ?? '').replace(/<[^>]+>/g, '').trim()
  return {
    id: b.id,
    title: b.title,
    link_url: b.link_url ?? '',
    link_target: b.link_target === '_blank' ? '_blank' : '_self',
    image_pc: b.image_pc ? mediaUrl(b.image_pc) : '',
    image_mobile: b.image_mobile ? mediaUrl(b.image_mobile) : b.image_pc ? mediaUrl(b.image_pc) : '',
    subtitle: strip(texts[0]?.text) || b.subtitle || null,
    phone: strip(texts[1]?.text) || b.phone || null,
    advertiser_org_id: b.advertiser_org_id,
    texts,
    colors: b.colors ?? [],
    html: b.html ?? '',
    product_ids: b.product_ids ?? [],
    extra_images: (b.extra_images ?? []).filter(Boolean).map((u) => mediaUrl(u)),
  }
}

/** 배너 그룹 전체 (한 번 읽어서 같은 요청 안에서 재사용). 0020 SQL 전이면 null */
export const getBannerGroups = cache(async (): Promise<BannerGroupRow[] | null> => {
  try {
    const { data, error } = await getAdminClient().from('banner_groups').select('*').order('sort_order')
    if (error) return null
    return (data ?? []) as BannerGroupRow[]
  } catch {
    return null
  }
})

/** 지금 보여줄 배너 (그룹 코드 기준). category: categoryIds 중 하나에 걸린 배너만 */
export async function getLiveBanners(code: string, categoryIds: string[] = []): Promise<LiveBanner[]> {
  try {
    const groups = await getBannerGroups()
    const now = new Date().toISOString()
    const admin = getAdminClient()

    if (!groups) {
      // 0020 SQL 전: 예전 방식(위치값)
      let q = admin
        .from('banner_ads')
        .select('*')
        .eq('placement', code)
        .eq('is_active', true)
        .lte('starts_at', now)
        .gt('ends_at', now)
        .order('sort_order')
        .limit(20)
      if (code === 'category') {
        if (categoryIds.length === 0) return []
        q = q.in('category_id', categoryIds)
      }
      const { data } = await q
      return ((data ?? []) as Row[]).map(toLive)
    }

    const group = groups.find((g) => g.code === code)
    if (!group || !group.is_active) return []
    let q = admin
      .from('banner_ads')
      .select('*')
      .eq('group_id', group.id)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('sort_order', { ascending: true })
      .limit(50)
    if (code === 'category') {
      if (categoryIds.length === 0) return []
      q = q.in('category_id', categoryIds)
    }
    const { data, error } = await q
    if (error) {
      console.error('[ads] banners read failed:', error.message)
      return []
    }
    return ((data ?? []) as Row[]).map(toLive)
  } catch (err) {
    console.error('[ads] banners failed', err)
    return []
  }
}

/** 배너들의 연결 상품 → 템플릿용 상품 정보 */
async function loadTemplateProducts(ids: string[]): Promise<Map<string, TemplateProduct>> {
  const map = new Map<string, TemplateProduct>()
  if (ids.length === 0) return map
  const { data } = await getAdminClient()
    .from('products')
    .select(
      'id, product_no, name, price, compare_at_price, status, track_stock, stock_qty, allow_backorder, short_description, spec_summary, org_id, org:orgs(slug, is_active)',
    )
    .in('id', ids)
  type P = {
    id: string
    product_no: number
    name: string
    price: number
    compare_at_price: number | null
    status: string
    track_stock: boolean
    stock_qty: number
    allow_backorder: boolean
    short_description: string | null
    spec_summary: string | null
    org_id: string
    org: { slug: string; is_active: boolean } | { slug: string; is_active: boolean }[] | null
  }
  const rows = (data ?? []) as P[]
  const byOrg = new Map<string, string[]>()
  for (const r of rows) byOrg.set(r.org_id, [...(byOrg.get(r.org_id) ?? []), r.id])
  const imgs: Record<string, string | null> = Object.assign(
    {},
    ...(await Promise.all([...byOrg].map(([o, list]) => getPrimaryImages(o, list)))),
  )
  for (const r of rows) {
    const org = Array.isArray(r.org) ? r.org[0] : r.org
    if (!org?.is_active || r.status !== 'active') continue
    map.set(r.id, {
      no: r.product_no,
      name: r.name,
      link: `/s/${org.slug}/products/${r.product_no}`,
      image: imgs[r.id] ?? null,
      price: Number(r.price ?? 0),
      compare_at_price: r.compare_at_price ? Number(r.compare_at_price) : null,
      soldout: r.track_stock && r.stock_qty <= 0 && !r.allow_backorder,
      summary: r.short_description,
      simple: r.spec_summary,
    })
  }
  return map
}

async function renderTemplate(group: BannerGroupRow, banners: LiveBanner[]): Promise<string> {
  const products = await loadTemplateProducts([...new Set(banners.flatMap((b) => b.product_ids))])
  const items: TemplateBanner[] = banners.map((b) => ({
    id: b.id,
    alt: b.title,
    link: b.link_url,
    link_target: b.link_target,
    image_pc: b.image_pc || null,
    image_mobile: b.image_mobile || null,
    texts: b.texts,
    colors: b.colors,
    html: b.html,
    extra_images: b.extra_images,
    products: b.product_ids.flatMap((id) => (products.has(id) ? [products.get(id) as TemplateProduct] : [])),
  }))
  try {
    return renderBannerCode(group.template_html as string, group.name, items)
  } catch (err) {
    console.error('[ads] template render failed', group.code, err)
    return ''
  }
}

/** 그룹에 배너 코드가 있으면 완성 HTML, 없으면 null (사이트 기본 모양 사용) */
export async function renderGroupHtml(code: string, banners: LiveBanner[]): Promise<string | null> {
  const groups = await getBannerGroups()
  const group = groups?.find((g) => g.code === code)
  if (!group || !isOwnTemplate(group.template_html) || banners.length === 0) return null
  return renderTemplate(group, banners)
}

/** 기본 자리가 없는 직접 만든 그룹(배너 코드 있음) — 메인 화면 아래쪽에 순서대로 */
export async function getCustomGroupHtml(): Promise<{ code: string; name: string; html: string }[]> {
  const groups = await getBannerGroups()
  if (!groups) return []
  const custom = groups.filter((g) => !g.is_builtin && g.is_active && isOwnTemplate(g.template_html))
  const out: { code: string; name: string; html: string }[] = []
  for (const g of custom) {
    const banners = await getLiveBanners(g.code)
    if (banners.length === 0) continue
    const html = await renderTemplate(g, banners)
    if (html) out.push({ code: g.code, name: g.name, html })
  }
  return out
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
