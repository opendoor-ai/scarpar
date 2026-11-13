import { notFound } from 'next/navigation'
import { PackageSearch } from 'lucide-react'

import { type Lang } from '@/lib/i18n'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { Category, Product } from '@/types/db'

import { EmptyState } from '@/components/ui/empty-state'
import { getPrimaryImages } from '@/components/store/get-primary-images'
import { getStoreOrg } from '@/components/store/get-store-org'
import { Pagination } from '@/components/store/pagination'
import { ProductCard, type ProductCardData } from '@/components/store/product-card'
import { CategoryPills, ProductSearchBox } from '@/components/store/products-filters'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type ProductRow = Pick<
  Product,
  'id' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
>

export default async function ProductsPage({
  params,
  searchParams,
}: PageProps<{ org: string }, { category?: string; q?: string; page?: string }>) {
  const { org: orgSlug } = await params
  const { category: categorySlug, q, page: pageParam } = await searchParams

  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  const supabase = getAnonClient()

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('org_id', org.id)
    .order('sort_order', { ascending: true })
  const categories = (categoryRows ?? []) as Pick<Category, 'id' | 'name' | 'slug'>[]
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined

  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select('id, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder', {
      count: 'exact',
    })
    .eq('org_id', org.id)
    .eq('status', 'active')

  if (activeCategory) query = query.eq('category_id', activeCategory.id)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, count } = await query.order('position', { ascending: true }).range(from, to)

  const products = (data ?? []) as ProductRow[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const images = await getPrimaryImages(
    org.id,
    products.map((p) => p.id),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryPills
          orgSlug={org.slug}
          categories={categories}
          activeSlug={activeCategory?.slug}
          query={q}
          lang={lang}
        />
        <ProductSearchBox orgSlug={org.slug} query={q} category={activeCategory?.slug} lang={lang} />
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
          <Pagination orgSlug={org.slug} page={page} totalPages={totalPages} query={q} category={activeCategory?.slug} />
        </>
      )}
    </div>
  )
}
