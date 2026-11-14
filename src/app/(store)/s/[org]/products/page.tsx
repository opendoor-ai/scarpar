import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PackageSearch } from 'lucide-react'

import { env } from '@/lib/env'
import { type Lang } from '@/lib/i18n'
import { categoryWithDescendants } from '@/lib/category-tree'
import {
  categoryKey,
  categoryQuery,
  categorySortSpec,
  findCategoryByParam,
  getPlatformCategories,
  type PlatformCategory,
} from '@/lib/platform-categories'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { Category, Product } from '@/types/db'

import { EmptyState } from '@/components/ui/empty-state'
import { getPrimaryImages } from '@/components/store/get-primary-images'
import { getOrgCategories } from '@/lib/org-categories'
import { getStoreOrg } from '@/components/store/get-store-org'
import { Pagination } from '@/components/store/pagination'
import { ProductCard, type ProductCardData } from '@/components/store/product-card'
import { CategoryPills, ProductSearchBox } from '@/components/store/products-filters'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type ProductRow = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
>

/** 상품 목록 제목·설명·대표주소 — 카테고리를 고르면 "카테고리명 제품"으로 바뀝니다. */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<{ org: string }, { cate_no?: string; category?: string; q?: string; page?: string }>): Promise<Metadata> {
  const { org: orgSlug } = await params
  const { cate_no, category: legacySlug } = await searchParams
  const org = await getStoreOrg(orgSlug)
  if (!org) return {}

  const activeCat = findCategoryByParam(await getPlatformCategories(), { cate_no, category: legacySlug })
  const categoryName = activeCat?.name ?? null

  const title = categoryName ? `${categoryName} 제품` : '전체 제품'
  const description = categoryName
    ? `${org.name}의 ${categoryName} 제품 목록입니다. 사양 확인과 전화·문자 문의가 가능합니다.`
    : `${org.name}의 전체 제품 목록입니다. 산업기계·중고기계 사양 확인과 전화·문자 문의가 가능합니다.`
  const canonical = `${env.APP_URL}/s/${org.slug}/products${activeCat ? `?${categoryQuery(activeCat)}` : ''}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} · ${org.name}`, description, url: canonical, siteName: org.name, locale: 'ko_KR' },
  }
}

export default async function ProductsPage({
  params,
  searchParams,
}: PageProps<{ org: string }, { cate_no?: string; category?: string; q?: string; page?: string }>) {
  const { org: orgSlug } = await params
  const { cate_no, category: legacySlug, q, page: pageParam } = await searchParams

  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  const supabase = getAnonClient()

  // 플랫폼 공통 카테고리 중 이 공급사 제품이 있는 분류만 버튼으로 보여줌
  const [allCategories, orgCats] = await Promise.all([getPlatformCategories(), getOrgCategories(org.id)])
  const categories: PlatformCategory[] = orgCats.categories
  const activeCategory = findCategoryByParam(allCategories, { cate_no, category: legacySlug })

  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select('id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder', {
      count: 'exact',
    })
    .eq('org_id', org.id)
    .eq('status', 'active')

  // 1차 카테고리를 고르면 그 아래 2차 카테고리 상품까지 함께 보여줌
  if (activeCategory) query = query.in('category_id', categoryWithDescendants(allCategories, activeCategory.id))
  if (q) query = query.ilike('name', `%${q}%`)

  const sort = activeCategory ? categorySortSpec(activeCategory.product_sort) : null
  const { data, count } = await (sort
    ? query.order(sort.column, { ascending: sort.ascending }).order('created_at', { ascending: false })
    : query.order('position', { ascending: true })
  ).range(from, to)

  const products = (data ?? []) as ProductRow[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const images = await getPrimaryImages(
    org.id,
    products.map((p) => p.id),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CategoryPills
          orgSlug={org.slug}
          categories={categories}
          activeSlug={activeCategory ? categoryKey(activeCategory) : undefined}
          counts={orgCats.counts}
          query={q}
          lang={lang}
        />
        <ProductSearchBox orgSlug={org.slug} query={q} category={activeCategory ? categoryKey(activeCategory) : undefined} lang={lang} />
      </div>

      {products.length === 0 ? (
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
            {products.map((p) => {
              const card: ProductCardData = { ...p, image: images[p.id] ?? null }
              return <ProductCard key={p.id} orgSlug={org.slug} product={card} lang={lang} />
            })}
          </div>
          <Pagination orgSlug={org.slug} page={page} totalPages={totalPages} query={q} category={activeCategory ? categoryKey(activeCategory) : undefined} />
        </>
      )}
    </div>
  )
}
