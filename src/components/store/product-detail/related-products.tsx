// 같은 공급사의 다른 상품 (가로로 넘겨 보기)

import { getAnonClient } from '@/lib/supabase/anon'
import type { Lang } from '@/lib/i18n'
import type { Product } from '@/types/db'

import { getPrimaryImages } from '../get-primary-images'
import { ProductCard, type ProductCardData } from '../product-card'

type Row = Pick<
  Product,
  'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder' | 'condition' | 'model_name' | 'badges'
>

export async function RelatedProducts({
  orgId,
  orgSlug,
  excludeId,
  lang,
}: {
  orgId: string
  orgSlug: string
  excludeId: string
  lang: Lang
}) {
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('products')
    .select('id, product_no, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder, condition, model_name, badges')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .neq('id', excludeId)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(12)
  const products = (data ?? []) as Row[]
  if (products.length === 0) return null

  const images = await getPrimaryImages(
    orgId,
    products.map((p) => p.id),
  )

  return (
    <section aria-labelledby="related-title">
      <h2 id="related-title" className="mb-4 text-center text-lg font-semibold">
        이 공급사의 다른 제품
      </h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {products.map((p) => {
          const card: ProductCardData = { ...p, image: images[p.id] ?? null }
          return (
            <div key={p.id} className="w-40 shrink-0 snap-start sm:w-44">
              <ProductCard orgSlug={orgSlug} product={card} lang={lang} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
