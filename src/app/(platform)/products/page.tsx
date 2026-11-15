// 통합 제품 검색 — 모든 공급사의 공개 상품을 한곳에서 카테고리·검색어로 찾습니다.
// 주소: /products , /products?cate_no=54 , /products?q=머시닝 (예전 ?category=영문주소 는 번호 주소로 이동)

import type { Metadata } from 'next'
import Link from 'next/link'
import { PackageSearch } from 'lucide-react'

import { categoryWithDescendants } from '@/lib/category-tree'
import { env } from '@/lib/env'
import { permanentRedirect } from 'next/navigation'

import {
  categoryKey,
  categoryQuery,
  categorySortSpec,
  findCategoryByParam,
  getPlatformCategories,
  visibleCategories,
} from '@/lib/platform-categories'
import { mediaUrl } from '@/lib/media-url'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { getSiteConfig } from '@/modules/site-config/get'
import { fillTemplate } from '@/modules/site-config/schemas'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { Product } from '@/types/db'

import { EmptyState } from '@/components/ui/empty-state'
import { getPrimaryImages } from '@/components/store/get-primary-images'
import { Pagination } from '@/components/store/pagination'
import { ProductCard, type ProductCardData } from '@/components/store/product-card'
import { CategoryPills } from '@/components/store/products-filters'
import { MembersHub, PremiumHub, SpecialHub } from '@/components/platform/hubs'
import { BannerCarousel } from '@/modules/ads/components/banner-carousel'
import { getHubBanners, getLiveBanners, getLivePromotedProductIds } from '@/modules/ads/live'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24
const BASE_PATH = '/products'
const PRODUCT_COLUMNS =
  'id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder, condition, model_name, badges, org_id, org:orgs!inner(slug, name)'

type Row = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder' | 'condition' | 'model_name' | 'badges'
> & {
  org_id: string
  org: { slug: string; name: string } | { slug: string; name: string }[] | null
}

type SearchParams = { cate_no?: string; category?: string; q?: string; page?: string }

/** 검색어에서 검색 문법을 깨는 문자 제거 (쉼표·괄호·% 등) */
function cleanQuery(q: string | undefined): string {
  return (q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 50)
}

export async function generateMetadata({ searchParams }: PageProps<Record<string, string>, SearchParams>): Promise<Metadata> {
  const { cate_no, category, q } = await searchParams
  const allCats = await getPlatformCategories()
  const activeCat = findCategoryByParam(allCats, { cate_no, category })
  const categoryName = activeCat?.name
  const query = cleanQuery(q)
  // 관리자 → SEO → 분류 페이지 문구 틀 (분류마다 따로 적은 검색 문구가 있으면 그것이 먼저)
  const { seo } = await getSiteConfig()
  let catVars: Record<string, string | number> = {}
  if (activeCat) {
    const { count } = await getAnonClient()
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('category_id', categoryWithDescendants(allCats, activeCat.id))
    const parent = activeCat.parent_id ? allCats.find((c) => c.id === activeCat.parent_id) : undefined
    catVars = { 분류명: activeCat.name, 상위분류명: parent?.name ?? '', 상품수: count ?? 0, 사이트명: SITE_NAME }
  }
  const title = activeCat?.seo_title
    ? activeCat.seo_title
    : categoryName
      ? fillTemplate(seo.categoryTitle, catVars) || `${categoryName} 제품`
      : query
        ? `${query} 검색 결과`
        : '전체 제품'
  const description = activeCat?.seo_description
    ? activeCat.seo_description
    : categoryName
      ? fillTemplate(seo.categoryDescription, catVars) ||
        `${categoryName} 산업기계·중고기계를 공급사별로 비교하고 바로 전화·문자로 문의하세요. ${SITE_NAME}`
      : seo.description || SITE_DESCRIPTION
  const canonical = `${env.APP_URL}${BASE_PATH}${activeCat ? `?${categoryQuery(activeCat)}` : ''}`
  return {
    title: activeCat?.seo_title ? { absolute: title } : { absolute: `${title} | ${SITE_NAME}` },
    description,
    keywords: activeCat?.seo_keywords
      ? activeCat.seo_keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined,
    alternates: { canonical },
    // 검색 결과 페이지는 검색엔진 색인 대상에서 제외 (중복·빈 페이지 방지)
    robots: query ? { index: false, follow: true } : undefined,
    openGraph: { title: `${title} · ${SITE_NAME}`, description, url: canonical, siteName: SITE_NAME, locale: 'ko_KR' },
  }
}

export default async function PlatformProductsPage({ searchParams }: PageProps<Record<string, string>, SearchParams>) {
  const { cate_no, category: legacySlug, q, page: pageParam } = await searchParams
  const query = cleanQuery(q)

  const allCategories = await getPlatformCategories()
  const categories = visibleCategories(allCategories)
  const activeCategory = findCategoryByParam(allCategories, { cate_no, category: legacySlug })
  // 예전 영문 주소(?category=...)로 들어오면 번호 주소로 영구 이동
  if (legacySlug && !cate_no && activeCategory?.cate_no) {
    const qs = new URLSearchParams({ cate_no: String(activeCategory.cate_no) })
    if (q) qs.set('q', q)
    if (pageParam) qs.set('page', pageParam)
    permanentRedirect(`${BASE_PATH}?${qs.toString()}`)
  }

  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE

  const supabase = getAnonClient()
  let request = supabase
    .from('products')
    .select(PRODUCT_COLUMNS, { count: 'exact' })
    .eq('status', 'active')
    .eq('org.is_active', true)

  // 1차 카테고리를 고르면 그 아래 2차 카테고리 상품까지 함께
  if (activeCategory) request = request.in('category_id', categoryWithDescendants(allCategories, activeCategory.id))
  // 상품명·모델명·제조사에서 찾기
  // 관리자 → 상품검색 설정에서 고른 항목으로 찾기 (상품코드는 P10006 · 10006 모두)
  if (query) {
    const { search } = await getSiteConfig()
    const col: Record<string, string> = { name: 'name', model: 'model_name', brand: 'brand', spec: 'spec_summary', summary: 'short_description' }
    const ors = search.fields.filter((f) => f !== 'code').map((f) => `${col[f]}.ilike.%${query}%`)
    const codeNo = Number(query.replace(/^p/i, ''))
    if (search.fields.includes('code') && /^p?\d{4,12}$/i.test(query) && Number.isSafeInteger(codeNo)) ors.push(`product_no.eq.${codeNo}`)
    request = request.or(ors.length ? ors.join(',') : `name.ilike.%${query}%`)
  }

  // 카테고리 페이지: 관리자가 정한 진열 순서 / 전체·검색: 진열 시각 순 (새 등록·점프한 제품이 맨 위)
  const sort = activeCategory ? categorySortSpec(activeCategory.product_sort) : null
  const ordered = sort
    ? request.order(sort.column, { ascending: sort.ascending }).order('created_at', { ascending: false })
    : request.order('display_at', { ascending: false })
  const { data, count, error } = await ordered.range(from, from + PAGE_SIZE - 1)
  if (error) console.error('[platform products] read failed:', error.message)

  const rows = (data ?? []) as unknown as Row[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // 광고: 검색 결과가 아닌 첫 페이지에서만 (배너 + 유료 상단 노출)
  const showAds = !query && page === 1
  const placement = activeCategory ? 'category' : 'main'
  const bannerCategoryIds = activeCategory
    ? [activeCategory.id, ...(activeCategory.parent_id ? [activeCategory.parent_id] : [])]
    : []
  const [banners, promotedIds] = showAds
    ? await Promise.all([
        getLiveBanners(placement, bannerCategoryIds),
        getLivePromotedProductIds(placement, activeCategory ? categoryWithDescendants(allCategories, activeCategory.id) : []),
      ])
    : [[], []]
  // 분류·검색 허브 (프리미엄·스페셜·멤버스): 지금 보고 있는 분류 번호와 정확히 같은 번호에만 보임
  // 전체 카테고리(분류를 고르지 않은 전체 제품 화면) = 0번, 검색 화면은 검색어로 고름
  const hubTarget = query
    ? { cateNos: [] as number[], query }
    : { cateNos: [activeCategory ? activeCategory.cate_no : 0], query: '' }
  const showHubs = page === 1
  const [premiumHub, specialHub, membersHub] = showHubs
    ? await Promise.all([
        getHubBanners('premium_hub', hubTarget),
        getHubBanners('special_hub', hubTarget),
        getHubBanners('members_hub', hubTarget),
      ])
    : [[], [], []]

  let promoted: Row[] = []
  if (promotedIds.length > 0) {
    const { data: promotedData } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .in('id', promotedIds)
      .eq('status', 'active')
      .eq('org.is_active', true)
    const order = new Map(promotedIds.map((id, i) => [id, i]))
    promoted = ((promotedData ?? []) as unknown as Row[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  // 대표 사진: 공급사별로 묶어서 가져옴
  const idsByOrg = new Map<string, string[]>()
  for (const r of [...rows, ...promoted]) {
    const list = idsByOrg.get(r.org_id) ?? []
    if (!list.includes(r.id)) idsByOrg.set(r.org_id, [...list, r.id])
  }
  const imageMaps = await Promise.all([...idsByOrg].map(([orgId, ids]) => getPrimaryImages(orgId, ids)))
  const images: Record<string, string | null> = Object.assign({}, ...imageMaps)

  const heading = activeCategory ? activeCategory.name : query ? `"${query}" 검색 결과` : '전체 제품'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {activeCategory?.top_image && !query ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(activeCategory.top_image)}
          alt={activeCategory.name}
          className="mb-6 aspect-[5/2] w-full rounded-lg border border-border object-cover sm:aspect-[5/1]"
        />
      ) : null}
      {/* 제목 (검색은 맨 위 머리글 검색창 하나로 — 휴대폰은 위·아래 검색 버튼) */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold sm:text-2xl">{heading}</h1>
        {activeCategory?.description && !query ? (
          <p className="text-sm whitespace-pre-line text-foreground/80">{activeCategory.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          모든 공급사의 산업기계·중고기계 {count ?? 0}개 — 마음에 드는 제품은 공급사에 바로 전화·문자로 문의하세요.
        </p>
        {query ? (
          <Link
            href={activeCategory ? `${BASE_PATH}?cate_no=${categoryKey(activeCategory)}` : BASE_PATH}
            className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            “{query}” 검색어 지우기 ✕
          </Link>
        ) : null}
      </div>

      <CategoryPills
        orgSlug=""
        basePath={BASE_PATH}
        categories={categories}
        activeSlug={activeCategory ? categoryKey(activeCategory) : undefined}
        query={query || undefined}
      />

      {banners.length > 0 ? <BannerCarousel banners={banners} className="mt-6" /> : null}

      {premiumHub.length > 0 ? (
        <div className="mt-8">
          <PremiumHub banners={premiumHub} />
        </div>
      ) : null}
      {specialHub.length > 0 ? (
        <div className="mt-8">
          <SpecialHub banners={specialHub} />
        </div>
      ) : null}
      {membersHub.length > 0 ? (
        <div className="mt-8">
          <MembersHub banners={membersHub} />
        </div>
      ) : null}

      {promoted.length > 0 ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">AD</span>
            추천 광고 제품
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {promoted.map((r) => {
              const org = Array.isArray(r.org) ? r.org[0] : r.org
              if (!org) return null
              const card: ProductCardData = { ...r, image: images[r.id] ?? null }
              return <ProductCard key={r.id} orgSlug={org.slug} product={card} supplierName={org.name} />
            })}
          </div>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={PackageSearch}
            title="제품을 찾을 수 없습니다"
            description="다른 검색어나 카테고리를 선택해 보세요."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => {
              const org = Array.isArray(r.org) ? r.org[0] : r.org
              if (!org) return null
              const card: ProductCardData = { ...r, image: images[r.id] ?? null }
              return <ProductCard key={r.id} orgSlug={org.slug} product={card} supplierName={org.name} />
            })}
          </div>
          <Pagination
            orgSlug=""
            basePath={BASE_PATH}
            page={page}
            totalPages={totalPages}
            query={query || undefined}
            category={activeCategory ? categoryKey(activeCategory) : undefined}
          />
        </>
      )}
    </div>
  )
}
