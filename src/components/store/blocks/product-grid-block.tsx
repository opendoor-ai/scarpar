import { categoryWithDescendants } from '@/lib/category-tree'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getAnonClient } from '@/lib/supabase/anon'
import type { Product, ProductGridBlock } from '@/types/db'

import { getPrimaryImages } from '../get-primary-images'
import { ProductCard, type ProductCardData } from '../product-card'
import type { BlockRenderContext } from './render-blocks'

type GridProductRow = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
>

export async function ProductGridBlockView({ block, ctx }: { block: ProductGridBlock; ctx: BlockRenderContext }) {
  if (block.mode === 'manual' && (!block.productIds || block.productIds.length === 0)) return null

  const supabase = getAnonClient()
  const limit = block.limit ?? 8

  let query = supabase
    .from('products')
    .select('id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder')
    .eq('org_id', ctx.org.id)
    .eq('status', 'active')

  if (block.mode === 'featured') {
    query = query.eq('is_featured', true)
  } else if (block.mode === 'category' && block.categoryId) {
    // 1차 카테고리면 하위 2차 카테고리 상품까지 포함
    const ids = categoryWithDescendants(await getPlatformCategories(), block.categoryId)
    query = query.in('category_id', ids)
  } else if (block.mode === 'manual' && block.productIds) {
    query = query.in('id', block.productIds)
  }

  const { data } = await (block.mode === 'latest'
    ? query.order('created_at', { ascending: false })
    : query.order('position', { ascending: true })
  ).limit(limit)
  let products = (data ?? []) as GridProductRow[]

  if (block.mode === 'manual' && block.productIds) {
    const order = new Map(block.productIds.map((id, i) => [id, i]))
    products = [...products].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  if (products.length === 0) return null

  const images = await getPrimaryImages(
    ctx.org.id,
    products.map((p) => p.id),
  )

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {block.title ? <h2 className="mb-5 text-lg font-semibold">{block.title}</h2> : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const card: ProductCardData = { ...p, image: images[p.id] ?? null }
          return <ProductCard key={p.id} orgSlug={ctx.org.slug} product={card} lang={ctx.lang} />
        })}
      </div>
    </section>
  )
}
