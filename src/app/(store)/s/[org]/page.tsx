import { notFound } from 'next/navigation'

import { type Lang } from '@/lib/i18n'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { CmsPage, Product } from '@/types/db'

import { RenderBlocks } from '@/components/store/blocks/render-blocks'
import { getPrimaryImages } from '@/components/store/get-primary-images'
import { getStoreOrg } from '@/components/store/get-store-org'
import { ProductCard, type ProductCardData } from '@/components/store/product-card'

export const dynamic = 'force-dynamic'

type FeaturedProductRow = Pick<
  Product,
  'id' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
>

export default async function StoreHomePage({ params }: PageProps<{ org: string }>) {
  const { org: orgSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  const supabase = getAnonClient()
  const { data: homePageRow } = await supabase
    .from('cms_pages')
    .select('id, blocks')
    .eq('org_id', org.id)
    .eq('type', 'home')
    .eq('status', 'published')
    .maybeSingle()

  if (homePageRow) {
    const page = homePageRow as Pick<CmsPage, 'id' | 'blocks'>
    return <RenderBlocks blocks={page.blocks} ctx={{ org, lang }} />
  }

  // No published home page yet — tasteful default hero + featured products fallback.
  const { data: featuredRows } = await supabase
    .from('products')
    .select('id, slug, name, price, compare_at_price, track_stock, stock_qty, allow_backorder')
    .eq('org_id', org.id)
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('position', { ascending: true })
    .limit(8)

  const featured = (featuredRows ?? []) as FeaturedProductRow[]
  const images = await getPrimaryImages(
    org.id,
    featured.map((p) => p.id),
  )

  return (
    <>
      <section className="flex min-h-[380px] w-full items-center justify-center bg-muted sm:min-h-[440px]">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 text-center">
          <h1 className="text-2xl font-semibold sm:text-3xl">{org.name}에 오신 것을 환영합니다</h1>
          <p className="max-w-lg text-sm text-muted-foreground">아래에서 최신 제품을 확인하세요.</p>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="mb-5 text-lg font-semibold">추천 제품</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => {
              const card: ProductCardData = { ...p, image: images[p.id] ?? null }
              return <ProductCard key={p.id} orgSlug={org.slug} product={card} lang={lang} />
            })}
          </div>
        </section>
      ) : null}
    </>
  )
}
