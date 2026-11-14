// 함께 구매해 보세요 — 같은 공급사가 등록한 다른 제품을 자동으로 모두 보여줌 (가로로 넘겨 보기)

import { HScroller } from '@/components/platform/h-scroller'
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
    .order('created_at', { ascending: false })
    .limit(200)
  const products = (data ?? []) as Row[]
  if (products.length === 0) return null

  const images = await getPrimaryImages(
    orgId,
    products.map((p) => p.id),
  )

  return (
    <section aria-labelledby="related-title">
      <h2 id="related-title" className="mb-1 text-center text-lg font-bold sm:text-xl">
        함께 구매해 보세요
      </h2>
      <p className="mb-5 text-center text-xs text-muted-foreground">같은 공급사의 다른 제품 {products.length}개</p>
      <HScroller label="함께 구매해 보세요">
        {products.map((p) => {
          const card: ProductCardData = { ...p, image: images[p.id] ?? null }
          return (
            <div key={p.id} className="w-[45%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2.25rem)/4)]">
              <ProductCard orgSlug={orgSlug} product={card} lang={lang} />
            </div>
          )
        })}
      </HScroller>
    </section>
  )
}
