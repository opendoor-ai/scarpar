import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'

import { env } from '@/lib/env'
import { decodeParam } from '@/lib/utils'

import { type Lang } from '@/lib/i18n'
import { mediaUrl } from '@/lib/media-url'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { Product, ProductVariant } from '@/types/db'

import Link from 'next/link'

import { getStoreOrg } from '@/components/store/get-store-org'
import { storePath } from '@/components/store/store-links'
import { ProductGallery } from '@/components/store/product-gallery'
import { ProductInquiryActions } from '@/components/store/product-inquiry-actions'
import { ProductPurchasePanel } from '@/components/store/product-purchase-panel'
import { ReviewsSection } from '@/components/store/reviews-section'

export const dynamic = 'force-dynamic'

interface ImageJoinRow {
  id: string
  position: number
  media: { path: string } | { path: string }[] | null
}

/** 공유용 제목·설명·대표 사진(Open Graph). 카카오톡·문자 등에 링크를 보내면 미리보기로 보입니다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; slug: string }>
}): Promise<Metadata> {
  const { org: orgSlug, slug: rawSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) return {}
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, description, brand')
    .eq('org_id', org.id)
    .eq('slug', decodeParam(rawSlug))
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return {}
  const product = data as Pick<Product, 'id' | 'name' | 'description' | 'brand'>

  const { data: imageRow } = await supabase
    .from('product_images')
    .select('media:media_id(path)')
    .eq('org_id', org.id)
    .eq('product_id', product.id)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()
  const media = (imageRow as { media: { path: string } | { path: string }[] | null } | null)?.media
  const imagePath = Array.isArray(media) ? media[0]?.path : media?.path
  const image = imagePath ? mediaUrl(imagePath) : undefined

  const description =
    (product.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 150) ||
    `${org.name}의 ${product.name}${product.brand ? ` (${product.brand})` : ''} 제품 정보와 문의`
  const url = `${env.APP_URL}/s/${org.slug}/product/${encodeURIComponent(decodeParam(rawSlug))}`

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${product.name} · ${org.name}`,
      description,
      url,
      siteName: org.name,
      locale: 'ko_KR',
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
    },
  }
}

export default async function ProductPage({ params }: PageProps<{ org: string; slug: string }>) {
  const { org: orgSlug, slug: rawSlug } = await params
  const slug = decodeParam(rawSlug)
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  const supabase = getAnonClient()
  const { data: productRow } = await supabase
    .from('products')
    .select('*')
    .eq('org_id', org.id)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (!productRow) notFound()
  const product = productRow as Product

  const [{ data: variantRows }, { data: imageRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('*')
      .eq('org_id', org.id)
      .eq('product_id', product.id)
      .order('position', { ascending: true }),
    supabase
      .from('product_images')
      .select('id, position, media:media_id(path)')
      .eq('org_id', org.id)
      .eq('product_id', product.id)
      .order('position', { ascending: true }),
  ])

  const variants = (variantRows ?? []) as ProductVariant[]

  // 카테고리: 상위 카테고리가 있으면 "상위 > 하위" 순서로 보여준다.
  let categoryTrail: { name: string; slug: string }[] = []
  if (product.category_id) {
    const { data: categoryRows, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .eq('org_id', org.id)
    if (categoryError) console.error('[product page] categories read failed:', categoryError.message)
    else if (!(categoryRows ?? []).some((r) => r.id === product.category_id))
      console.warn('[product page] product category not visible to anon:', product.category_id)
    const rows = (categoryRows ?? []) as {
      id: string
      name: string
      slug: string
      parent_id: string | null
    }[]
    const byId = new Map(rows.map((r) => [r.id, r]))
    let current = byId.get(product.category_id)
    while (current && categoryTrail.length < 5) {
      categoryTrail = [{ name: current.name, slug: current.slug }, ...categoryTrail]
      current = current.parent_id ? byId.get(current.parent_id) : undefined
    }
  }

  const imageUrls = ((imageRows ?? []) as unknown as ImageJoinRow[])
    .map((row) => {
      const media = Array.isArray(row.media) ? row.media[0] : row.media
      return media?.path ? mediaUrl(media.path) : null
    })
    .filter((url): url is string => Boolean(url))

  const productUrl = `${env.APP_URL}/s/${org.slug}/product/${encodeURIComponent(product.slug)}`
  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    margin: 1,
    width: 320,
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={imageUrls} name={product.name} />
        <div className="flex flex-col gap-4">
          {categoryTrail.length > 0 ? (
            <nav aria-label="카테고리" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {categoryTrail.map((c, i) => (
                <span key={c.slug} className="flex items-center gap-1">
                  {i > 0 ? <span aria-hidden>›</span> : null}
                  <Link
                    href={`${storePath(org.slug, '/products')}?category=${encodeURIComponent(c.slug)}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {c.name}
                  </Link>
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="text-xl font-semibold">{product.name}</h1>
          {product.brand ? <p className="text-sm text-muted-foreground">제조사: {product.brand}</p> : null}
          <ProductPurchasePanel product={product} variants={variants} image={imageUrls[0] ?? null} lang={lang} />
          <ProductInquiryActions
            productName={product.name}
            modelName={product.sku}
            supplierName={org.name}
            supplierPhone={org.phone}
            productUrl={productUrl}
            qrDataUrl={qrDataUrl}
          />
          {product.description ? (
            <p className="border-t border-border pt-4 text-sm whitespace-pre-line text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>

      <ReviewsSection orgId={org.id} orgSlug={org.slug} productId={product.id} />
    </div>
  )
}
