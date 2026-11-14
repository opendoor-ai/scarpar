// 통합 제품 검색 — 모든 공급사의 공개 상품을 한곳에서 카테고리·검색어로 찾습니다.
// 주소: /products , /products?category=machine-tools , /products?q=머시닝

import type { Metadata } from 'next'
import { PackageSearch } from 'lucide-react'

import { categoryWithDescendants } from '@/lib/category-tree'
import { env } from '@/lib/env'
import { getPlatformCategories } from '@/lib/platform-categories'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { Product } from '@/types/db'

import { EmptyState } from '@/components/ui/empty-state'
import { getPrimaryImages } from '@/components/store/get-primary-images'
import { Pagination } from '@/components/store/pagination'
import { ProductCard, type ProductCardData } from '@/components/store/product-card'
import { CategoryPills, ProductSearchBox } from '@/components/store/products-filters'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24
const BASE_PATH = '/products'

type Row = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
> & {
  org_id: string
  org: { slug: string; name: string } | { slug: string; name: string }[] | null
}

type SearchParams = { category?: string; q?: string; page?: string }

/** 검색어에서 검색 문법을 깨는 문자 제거 (쉼표·괄호·% 등) */
function cleanQuery(q: string | undefined): string {
  return (q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 50)
}

export async function generateMetadata({ searchParams }: PageProps<Record<string, string>, SearchParams>): Promise<Metadata> {
  const { category, q } = await searchParams
  const categoryName = category ? (await getPlatformCategories()).find((c) => c.slug === category)?.name : undefined
  const query = cleanQuery(q)
  const title = categoryName ? `${categoryName} 제품` : query ? `${query} 검색 결과` : '전체 제품'
  const description = categoryName
    ? `${categoryName} 산업기계·중고기계를 공급사별로 비교하고 바로 전화·문자로 문의하세요. ${SITE_NAME}`
    : SITE_DESCRIPTION
  const canonical = `${env.APP_URL}${BASE_PATH}${categoryName && category ? `?category=${encodeURIComponent(category)}` : ''}`
  return {
    title: `${title} · ${SITE_NAME}`,
    description,
    alternates: { canonical },
    // 검색 결과 페이지는 검색엔진 색인 대상에서 제외 (중복·빈 페이지 방지)
    robots: query ? { index: false, follow: true } : undefined,
    openGraph: { title: `${title} · ${SITE_NAME}`, description, url: canonical, siteName: SITE_NAME, locale: 'ko_KR' },
  }
}

export default async function PlatformProductsPage({ searchParams }: PageProps<Record<string, string>, SearchParams>) {
  const { category: categorySlug, q, page: pageParam } = await searchParams
  const query = cleanQuery(q)

  const categories = await getPlatformCategories()
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined

  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE

  const supabase = getAnonClient()
  let request = supabase
    .from('products')
    .select(
      'id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder, org_id, org:orgs!inner(slug, name)',
      { count: 'exact' },
    )
    .eq('status', 'active')
    .eq('org.is_active', true)

  // 1차 카테고리를 고르면 그 아래 2차 카테고리 상품까지 함께
  if (activeCategory) request = request.in('category_id', categoryWithDescendants(categories, activeCategory.id))
  // 상품명·모델명·제조사에서 찾기
  if (query) request = request.or(`name.ilike.%${query}%,model_name.ilike.%${query}%,brand.ilike.%${query}%`)

  const { data, count, error } = await request
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (error) console.error('[platform products] read failed:', error.message)

  const rows = (data ?? []) as unknown as Row[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // 대표 사진: 공급사별로 묶어서 가져옴
  const idsByOrg = new Map<string, string[]>()
  for (const r of rows) idsByOrg.set(r.org_id, [...(idsByOrg.get(r.org_id) ?? []), r.id])
  const imageMaps = await Promise.all([...idsByOrg].map(([orgId, ids]) => getPrimaryImages(orgId, ids)))
  const images: Record<string, string | null> = Object.assign({}, ...imageMaps)

  const heading = activeCategory ? activeCategory.name : query ? `"${query}" 검색 결과` : '전체 제품'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold sm:text-2xl">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          모든 공급사의 산업기계·중고기계 {count ?? 0}개 — 마음에 드는 제품은 공급사에 바로 전화·문자로 문의하세요.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CategoryPills
          orgSlug=""
          basePath={BASE_PATH}
          categories={categories}
          activeSlug={activeCategory?.slug}
          query={query || undefined}
        />
        <ProductSearchBox
          orgSlug=""
          basePath={BASE_PATH}
          query={query || undefined}
          category={activeCategory?.slug}
          placeholder="제품명·모델명·제조사 검색"
        />
      </div>

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
            category={activeCategory?.slug}
          />
        </>
      )}
    </div>
  )
}
